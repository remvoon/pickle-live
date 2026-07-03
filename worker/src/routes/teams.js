/**
 * Team routes (admin only)
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const teamRoutes = new Hono();

const ANIMALS = [
  '🦊', '🐶', '🐱', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🦄',
  '🐙', '🦋', '🐝', '🦉', '🐢', '🦎', '🐬', '🦭', '🦩', '🐧',
  '🦆', '🦅', '🐺', '🦝', '🐮', '🐷', '🐭', '🐹', '🐰', '🐻',
  '🦇', '🐳', '🦈', '🐊', '🦍', '🦒', '🦏', '🐘', '🦛', '🐪',
  '🐑', '🐐', '🦌', '🐕', '🐈', '🦜', '🐾', '🐿️',
];

function getTeamEmoji(teamId) {
  if (!teamId) return '🦊';
  let hash = 0;
  const str = String(teamId);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return ANIMALS[Math.abs(hash) % ANIMALS.length];
}

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
    'INSERT INTO teams (event_id, name, player1_id, player2_id, emoji) VALUES (?, ?, ?, ?, ?)',
    slug, teamName, body.player1_id, body.player2_id, body.emoji || getTeamEmoji(teamNumber)
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
      p1.name AS player1_name, p1.nickname AS player1_nickname, p1.gender AS player1_gender, p1.paddle AS player1_paddle, p1.handedness AS player1_handedness,
      p2.name AS player2_name, p2.nickname AS player2_nickname, p2.gender AS player2_gender, p2.paddle AS player2_paddle, p2.handedness AS player2_handedness
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
  if (body.emoji !== undefined) { fields.push('emoji = ?'); values.push(body.emoji); }
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

  // Remove from groups first
  await execute(db, 'DELETE FROM group_teams WHERE team_id = ?', id);
  // Matches cascade-delete via FK; delete the team itself
  await execute(db, 'DELETE FROM teams WHERE id = ? AND event_id = ?', id, slug);

  return c.json({ success: true });
});

// DELETE /api/admin/events/:slug/teams — unpair all teams
teamRoutes.delete('/:slug/teams', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  // Remove all teams from groups
  await execute(db, `
    DELETE FROM group_teams WHERE team_id IN (
      SELECT id FROM teams WHERE event_id = ?
    )
  `, slug);

  // Delete all teams for this event
  const result = await execute(db, 'DELETE FROM teams WHERE event_id = ?', slug);

  return c.json({ success: true, deleted: result.meta?.changes || 0 });
});

// POST /api/admin/events/:slug/teams/random-pair — randomly pair unpaired participants
teamRoutes.post('/:slug/teams/random-pair', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  // Get all participants and existing team player IDs
  const participants = await query(db, 'SELECT id FROM participants WHERE event_id = ?', slug);
  const teams = await query(db, 'SELECT player1_id, player2_id FROM teams WHERE event_id = ?', slug);

  const pairedIds = new Set(teams.flatMap(t => [t.player1_id, t.player2_id]));
  const unpaired = participants.filter(p => !pairedIds.has(p.id));

  if (unpaired.length < 2) {
    return c.json({ error: 'Need at least 2 unpaired participants to pair' }, 400);
  }

  // Shuffle Fisher-Yates
  for (let i = unpaired.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unpaired[i], unpaired[j]] = [unpaired[j], unpaired[i]];
  }

  // Get current team count for naming
  const teamCount = await queryOne(db,
    'SELECT COUNT(*) as count FROM teams WHERE event_id = ?', slug
  );
  let teamNumber = (teamCount?.count || 0);

  const created = [];
  // Pair up in twos, leave last if odd
  for (let i = 0; i + 1 < unpaired.length; i += 2) {
    teamNumber++;
    const teamName = `Team ${teamNumber}`;
    const result = await execute(db,
      'INSERT INTO teams (event_id, name, player1_id, player2_id, emoji) VALUES (?, ?, ?, ?, ?)',
      slug, teamName, unpaired[i].id, unpaired[i + 1].id, getTeamEmoji(teamNumber)
    );
    const team = await queryOne(db, 'SELECT * FROM teams WHERE id = ?', result.meta.last_row_id);
    created.push(team);
  }

  return c.json({ success: true, created, remaining: unpaired.length % 2 });
});

export default teamRoutes;
