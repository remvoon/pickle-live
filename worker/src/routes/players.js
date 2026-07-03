/**
 * Global players routes (admin only) — players not tied to a specific event
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const GLOBAL_EVENT = '__global__';

const playerRoutes = new Hono();

// GET /api/admin/players - list all global players
playerRoutes.get('/', async (c) => {
  const db = c.env.DB;
  const players = await query(db,
    `SELECT id, name, COALESCE(NULLIF(nickname, ''), name) AS display_nickname,
            gender, paddle, handedness, email, avatar, created_at
     FROM participants WHERE event_id = ? ORDER BY name ASC`,
    GLOBAL_EVENT
  );
  return c.json(players);
});

// POST /api/admin/players - create a global player
playerRoutes.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const nickname = body.nickname || body.name;

  // Check if this name already exists in global pool
  const existing = await queryOne(db,
    'SELECT id FROM participants WHERE event_id = ? AND name = ?',
    GLOBAL_EVENT, body.name
  );
  if (existing) {
    return c.json({ error: 'A player with this name already exists in the global pool' }, 409);
  }

  const result = await execute(db,
    `INSERT INTO participants (event_id, name, nickname, gender, paddle, handedness, email, avatar)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    GLOBAL_EVENT, body.name, nickname, body.gender || '', body.paddle || '',
    body.handedness || '', body.email || '', body.avatar || ''
  );

  const player = await queryOne(db,
    'SELECT * FROM participants WHERE id = ?', result.meta.last_row_id
  );
  return c.json(player, 201);
});

// PUT /api/admin/players/:id - update a global player
playerRoutes.put('/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  const existing = await queryOne(db,
    'SELECT * FROM participants WHERE id = ? AND event_id = ?', id, GLOBAL_EVENT
  );
  if (!existing) {
    return c.json({ error: 'Global player not found' }, 404);
  }

  const fields = [];
  const values = [];
  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
  if (body.nickname !== undefined) { fields.push('nickname = ?'); values.push(body.nickname); }
  if (body.gender !== undefined) { fields.push('gender = ?'); values.push(body.gender); }
  if (body.paddle !== undefined) { fields.push('paddle = ?'); values.push(body.paddle); }
  if (body.handedness !== undefined) { fields.push('handedness = ?'); values.push(body.handedness); }
  if (body.email !== undefined) { fields.push('email = ?'); values.push(body.email); }
  if (body.avatar !== undefined) { fields.push('avatar = ?'); values.push(body.avatar); }

  if (fields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  values.push(id);
  await execute(db, `UPDATE participants SET ${fields.join(', ')} WHERE id = ?`, ...values);

  const player = await queryOne(db, 'SELECT * FROM participants WHERE id = ?', id);
  return c.json(player);
});

// DELETE /api/admin/players/:id - delete a global player
playerRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;

  // Check if this player is used in any event
  const usage = await queryOne(db,
    'SELECT COUNT(*) as cnt FROM participants WHERE name = (SELECT name FROM participants WHERE id = ?) AND event_id != ?',
    id, GLOBAL_EVENT
  );

  await execute(db, 'DELETE FROM participants WHERE id = ? AND event_id = ?', id, GLOBAL_EVENT);
  return c.json({ success: true, used_in_events: usage?.cnt || 0 });
});

export default playerRoutes;
