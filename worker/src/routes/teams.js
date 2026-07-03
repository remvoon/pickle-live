/**
 * Team routes (admin only)
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const teamRoutes = new Hono();

// POST /api/admin/events/:slug/teams
teamRoutes.post('/:slug/teams', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.player1_id || !body.player2_id) {
    return c.json({ error: 'player1_id and player2_id are required' }, 400);
  }

  if (body.player1_id === body.player2_id) {
    return c.json({ error: 'A team must have two different players' }, 400);
  }

  // Check players exist and belong to event
  const p1 = await queryOne(db, 'SELECT id FROM participants WHERE id = ? AND event_id = ?', body.player1_id, slug);
  const p2 = await queryOne(db, 'SELECT id FROM participants WHERE id = ? AND event_id = ?', body.player2_id, slug);
  if (!p1 || !p2) {
    return c.json({ error: 'One or both participants not found' }, 404);
  }

  // Check if either player is already on a team in this event
  const existingTeam = await queryOne(db,
    'SELECT id FROM teams WHERE event_id = ? AND (player1_id = ? OR player2_id = ?)',
    slug, body.player1_id, body.player2_id
  );
  if (existingTeam && existingTeam.id !== (body.id || 0)) {
    return c.json({ error: 'One or both players are already on a team in this event' }, 409);
  }

  // Auto-generate team name
  const teamCount = await queryOne(db,
    'SELECT COUNT(*) as count FROM teams WHERE event_id = ?', slug
  );
  const teamNumber = (teamCount?.count || 0) + 1;
  const teamName = body.name || `Team ${teamNumber}`;

  const result = await execute(db,
    'INSERT INTO teams (event_id, name, player1_id, player2_id) VALUES (?, ?, ?, ?)',
    slug, teamName, body.player1_id, body.player2_id
  );

  const team = await queryOne(db, 'SELECT * FROM teams WHERE id = ?', result.meta.last_row_id);
  return c.json(team, 201);
});

// GET /api/admin/events/:slug/teams
teamRoutes.get('/:slug/teams', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const teams = await query(db, `
    SELECT t.*, 
      p1.name AS player1_name, p1.gender AS player1_gender, p1.paddle AS player1_paddle, p1.handedness AS player1_handedness,
      p2.name AS player2_name, p2.gender AS player2_gender, p2.paddle AS player2_paddle, p2.handedness AS player2_handedness
    FROM teams t
    LEFT JOIN participants p1 ON t.player1_id = p1.id
    LEFT JOIN participants p2 ON t.player2_id = p2.id
    WHERE t.event_id = ?
    ORDER BY t.name ASC
  `, slug);
  return c.json(teams);
});

// PUT /api/admin/events/:slug/teams/:id
teamRoutes.put('/:slug/teams/:id', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  const existing = await queryOne(db,
    'SELECT * FROM teams WHERE id = ? AND event_id = ?', id, slug
  );
  if (!existing) {
    return c.json({ error: 'Team not found' }, 404);
  }

  const fields = [];
  const values = [];

  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
  if (body.player1_id !== undefined) {
    const p = await queryOne(db, 'SELECT id FROM participants WHERE id = ? AND event_id = ?', body.player1_id, slug);
    if (!p) return c.json({ error: 'Player 1 not found' }, 404);
    fields.push('player1_id = ?'); values.push(body.player1_id);
  }
  if (body.player2_id !== undefined) {
    const p = await queryOne(db, 'SELECT id FROM participants WHERE id = ? AND event_id = ?', body.player2_id, slug);
    if (!p) return c.json({ error: 'Player 2 not found' }, 404);
    fields.push('player2_id = ?'); values.push(body.player2_id);
  }

  if (fields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  values.push(id);
  await execute(db, `UPDATE teams SET ${fields.join(', ')} WHERE id = ?`, ...values);

  const team = await queryOne(db, 'SELECT * FROM teams WHERE id = ?', id);
  return c.json(team);
});

// DELETE /api/admin/events/:slug/teams/:id
teamRoutes.delete('/:slug/teams/:id', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;

  // Check if team has matches
  const matchCheck = await queryOne(db,
    'SELECT id FROM matches WHERE (team1_id = ? OR team2_id = ?) AND id IN (SELECT id FROM matches m JOIN stages s ON m.stage_id = s.id WHERE s.event_id = ?)',
    id, id, slug
  );
  
  // Remove from groups first
  await execute(db, 'DELETE FROM group_teams WHERE team_id = ?', id);
  await execute(db, 'DELETE FROM teams WHERE id = ? AND event_id = ?', id, slug);
  
  return c.json({ success: true });
});

export default teamRoutes;
