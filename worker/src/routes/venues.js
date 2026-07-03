/**
 * Venues routes - saved venue/court presets (admin only)
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const venueRoutes = new Hono();

// GET /api/admin/venues - list all saved venues
venueRoutes.get('/', async (c) => {
  const db = c.env.DB;
  const venues = await query(db, 'SELECT * FROM venues ORDER BY name ASC');
  return c.json(venues);
});

// POST /api/admin/venues - create a new saved venue
venueRoutes.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { name, courts } = body;

  if (!name || !name.trim()) {
    return c.json({ error: 'Venue name is required' }, 400);
  }

  // Check for duplicate name
  const existing = await queryOne(db, 'SELECT id FROM venues WHERE name = ?', name.trim());
  if (existing) {
    return c.json({ error: 'A venue with this name already exists' }, 409);
  }

  const courtsJson = JSON.stringify(courts || []);
  await execute(db, 'INSERT INTO venues (name, courts) VALUES (?, ?)', name.trim(), courtsJson);

  const venue = await queryOne(db, 'SELECT * FROM venues WHERE name = ?', name.trim());
  return c.json(venue, 201);
});

// PUT /api/admin/venues/:id - update a saved venue
venueRoutes.put('/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  const existing = await queryOne(db, 'SELECT * FROM venues WHERE id = ?', id);
  if (!existing) {
    return c.json({ error: 'Venue not found' }, 404);
  }

  const fields = [];
  const values = [];
  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name.trim()); }
  if (body.courts !== undefined) { fields.push('courts = ?'); values.push(JSON.stringify(body.courts)); }

  if (fields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  values.push(id);
  await execute(db, `UPDATE venues SET ${fields.join(', ')} WHERE id = ?`, ...values);

  const venue = await queryOne(db, 'SELECT * FROM venues WHERE id = ?', id);
  return c.json(venue);
});

// DELETE /api/admin/venues/:id - delete a saved venue
venueRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;

  const existing = await queryOne(db, 'SELECT id FROM venues WHERE id = ?', id);
  if (!existing) {
    return c.json({ error: 'Venue not found' }, 404);
  }

  await execute(db, 'DELETE FROM venues WHERE id = ?', id);
  return c.json({ success: true });
});

export default venueRoutes;
