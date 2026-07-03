/**
 * Event routes (admin routes only — public routes are in index.js)
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const eventRoutes = new Hono();

// --- Admin (auth applied in index.js) ---

// POST /api/admin/events
eventRoutes.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const { slug, name, date, description } = body;

  if (!slug || !name || !date) {
    return c.json({ error: 'slug, name, and date are required' }, 400);
  }

  // Check if slug already exists
  const existing = await queryOne(db, 'SELECT id FROM events WHERE id = ?', slug);
  if (existing) {
    return c.json({ error: 'An event with this slug already exists' }, 409);
  }

  await execute(db,
    'INSERT INTO events (id, name, date, description) VALUES (?, ?, ?, ?)',
    slug, name, date, description || ''
  );

  const event = await queryOne(db, 'SELECT * FROM events WHERE id = ?', slug);
  return c.json(event, 201);
});

// PUT /api/admin/events/:slug
eventRoutes.put('/:slug', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  const existing = await queryOne(db, 'SELECT * FROM events WHERE id = ?', slug);
  if (!existing) {
    return c.json({ error: 'Event not found' }, 404);
  }

  const fields = [];
  const values = [];
  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
  if (body.date !== undefined) { fields.push('date = ?'); values.push(body.date); }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }

  if (fields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  values.push(slug);
  await execute(db, `UPDATE events SET ${fields.join(', ')} WHERE id = ?`, ...values);

  const event = await queryOne(db, 'SELECT * FROM events WHERE id = ?', slug);
  return c.json(event);
});

// POST /api/admin/events/:slug/banner
eventRoutes.post('/:slug/banner', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  const existing = await queryOne(db, 'SELECT * FROM events WHERE id = ?', slug);
  if (!existing) {
    return c.json({ error: 'Event not found' }, 404);
  }

  const formData = await c.req.formData();
  const file = formData.get('image');
  if (!file) {
    return c.json({ error: 'No image file provided' }, 400);
  }

  const ext = file.name.split('.').pop() || 'png';
  const timestamp = Date.now();
  const key = `banners/${slug}-${timestamp}.${ext}`;

  const bucket = c.env.BUCKET;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type }
  });

  // Public URL: /api/banners/<filename> (handler prepends banners/ when reading from R2)
  const filename = `${slug}-${timestamp}.${ext}`;
  const bannerUrl = `/api/banners/${filename}`;

  await execute(db, 'UPDATE events SET banner_url = ? WHERE id = ?', bannerUrl, slug);

  return c.json({ banner_url: bannerUrl, key: filename });
});



// GET /api/admin/events/:slug/share - return public URL
eventRoutes.get('/:slug/share', async (c) => {
  const { slug } = c.req.param();
  const origin = c.req.header('Origin') || `https://pickle-live.pages.dev`;
  const url = `${origin}/event/${slug}`;
  return c.json({ url });
});

export default eventRoutes;
