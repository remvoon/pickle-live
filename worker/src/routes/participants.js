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
    'SELECT * FROM participants WHERE event_id = ? ORDER BY name ASC',
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

  const result = await execute(db,
    'INSERT INTO participants (event_id, name, gender, paddle, handedness, email) VALUES (?, ?, ?, ?, ?, ?)',
    slug, body.name, body.gender || '', body.paddle || '', body.handedness || '', body.email || ''
  );

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
  if (body.gender !== undefined) { fields.push('gender = ?'); values.push(body.gender); }
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

  // Check if participant is assigned to any team
  const teamCheck = await queryOne(db,
    'SELECT id FROM teams WHERE (player1_id = ? OR player2_id = ?) AND event_id = ?',
    id, id, slug
  );
  if (teamCheck) {
    return c.json({ error: 'Cannot delete participant assigned to a team. Remove from team first.' }, 409);
  }

  await execute(db, 'DELETE FROM participants WHERE id = ? AND event_id = ?', id, slug);
  return c.json({ success: true });
});

export default participantRoutes;
