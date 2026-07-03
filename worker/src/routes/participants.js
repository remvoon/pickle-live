/**
 * Participant routes (admin only)
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const participantRoutes = new Hono();

// GET /api/admin/events/:slug/participants
participantRoutes.get('/:slug/participants', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const participants = await query(db,
    `SELECT * FROM participants WHERE event_id = ? AND event_id != '__global__' ORDER BY name ASC`,
    slug
  );
  return c.json(participants);
});

// POST /api/admin/events/:slug/participants
participantRoutes.post('/:slug/participants', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const nickname = body.nickname || body.name;

  // Add to event
  const result = await execute(db,
    'INSERT INTO participants (event_id, name, nickname, gender, paddle, handedness, email, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    slug, body.name, nickname, body.gender || '', body.paddle || '', body.handedness || '', body.email || '', body.avatar || ''
  );

  // Auto-sync to global registry if not already there
  const globalExists = await queryOne(db,
    'SELECT id FROM participants WHERE event_id = ? AND name = ?', '__global__', body.name
  );
  if (!globalExists) {
    await execute(db,
      'INSERT INTO participants (event_id, name, nickname, gender, paddle, handedness, email, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      '__global__', body.name, nickname, body.gender || '', body.paddle || '', body.handedness || '', body.email || '', body.avatar || ''
    );
  }

  const participant = await queryOne(db,
    'SELECT * FROM participants WHERE id = ?', result.meta.last_row_id
  );
  return c.json(participant, 201);
});

// PUT /api/admin/events/:slug/participants/:id
participantRoutes.put('/:slug/participants/:id', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  const existing = await queryOne(db,
    'SELECT * FROM participants WHERE id = ? AND event_id = ?', id, slug
  );
  if (!existing) {
    return c.json({ error: 'Participant not found' }, 404);
  }

  const fields = [];
  const values = [];
  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
  if (body.nickname !== undefined) { fields.push('nickname = ?'); values.push(body.nickname); }
  if (body.gender !== undefined) { fields.push('gender = ?'); values.push(body.gender); }
  if (body.avatar !== undefined) { fields.push('avatar = ?'); values.push(body.avatar); }
  if (body.paddle !== undefined) { fields.push('paddle = ?'); values.push(body.paddle); }
  if (body.handedness !== undefined) { fields.push('handedness = ?'); values.push(body.handedness); }
  if (body.email !== undefined) { fields.push('email = ?'); values.push(body.email); }

  if (fields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  values.push(id);
  await execute(db, `UPDATE participants SET ${fields.join(', ')} WHERE id = ?`, ...values);

  const participant = await queryOne(db, 'SELECT * FROM participants WHERE id = ?', id);
  return c.json(participant);
});

// DELETE /api/admin/events/:slug/participants/:id
participantRoutes.delete('/:slug/participants/:id', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;

  // Auto-remove from any teams first (cascading)
  const teamsWithPlayer = await query(db,
    'SELECT id FROM teams WHERE (player1_id = ? OR player2_id = ?) AND event_id = ?',
    id, id, slug
  );
  for (const team of teamsWithPlayer) {
    await execute(db, 'DELETE FROM group_teams WHERE team_id = ?', team.id);
    await execute(db, 'DELETE FROM matches WHERE team1_id = ? OR team2_id = ?', team.id, team.id);
    await execute(db, 'DELETE FROM teams WHERE id = ?', team.id);
  }

  await execute(db, 'DELETE FROM participants WHERE id = ? AND event_id = ?', id, slug);
  return c.json({ success: true, removed_from_teams: teamsWithPlayer.length });
});

// POST /api/admin/events/:slug/participants/batch - add global players to an event
participantRoutes.post('/:slug/participants/batch', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.player_ids || !Array.isArray(body.player_ids) || body.player_ids.length === 0) {
    return c.json({ error: 'player_ids array is required' }, 400);
  }

  const added = [];
  for (const pid of body.player_ids) {
    const globalPlayer = await queryOne(db,
      'SELECT * FROM participants WHERE id = ? AND event_id = ?', pid, '__global__'
    );
    if (!globalPlayer) continue;

    const alreadyInEvent = await queryOne(db,
      'SELECT id FROM participants WHERE event_id = ? AND name = ?', slug, globalPlayer.name
    );
    if (alreadyInEvent) continue;

    const result = await execute(db,
      `INSERT INTO participants (event_id, name, nickname, gender, paddle, handedness, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      slug, globalPlayer.name, globalPlayer.nickname, globalPlayer.gender || '',
      globalPlayer.paddle || '', globalPlayer.handedness || '', globalPlayer.email || ''
    );

    const p = await queryOne(db, 'SELECT * FROM participants WHERE id = ?', result.meta.last_row_id);
    added.push(p);
  }

  return c.json(added, 201);
});

export default participantRoutes;
