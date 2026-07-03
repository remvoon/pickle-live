/**
 * Event routes (public + admin)
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const eventRoutes = new Hono();

// --- Public ---

// GET /api/events/:slug - full event details
eventRoutes.get('/:slug', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  const event = await queryOne(db, 'SELECT * FROM events WHERE id = ?', slug);
  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  const stages = await query(db, 'SELECT * FROM stages WHERE event_id = ? ORDER BY order_index ASC', slug);
  
  // Get groups, teams, matches per stage
  const stagesWithData = [];
  for (const stage of stages) {
    const groups = await query(db, `
      SELECT g.* FROM groups_t g
      JOIN stage_groups sg ON g.id = sg.group_id
      WHERE sg.stage_id = ?
      ORDER BY g.name ASC
    `, stage.id);

    const groupsWithData = [];
    for (const group of groups) {
      const teams = await query(db, `
        SELECT t.*, 
          p1.name AS player1_name, p1.gender AS player1_gender, p1.paddle AS player1_paddle, p1.handedness AS player1_handedness,
          p2.name AS player2_name, p2.gender AS player2_gender, p2.paddle AS player2_paddle, p2.handedness AS player2_handedness
        FROM teams t
        JOIN group_teams gt ON t.id = gt.team_id
        LEFT JOIN participants p1 ON t.player1_id = p1.id
        LEFT JOIN participants p2 ON t.player2_id = p2.id
        WHERE gt.group_id = ?
      `, group.id);

      const matches = await query(db, `
        SELECT m.*,
          t1.name AS team1_name, t2.name AS team2_name,
          p1.name AS team1_player1_name, p2.name AS team1_player2_name,
          p3.name AS team2_player1_name, p4.name AS team2_player2_name
        FROM matches m
        LEFT JOIN teams t1 ON m.team1_id = t1.id
        LEFT JOIN teams t2 ON m.team2_id = t2.id
        LEFT JOIN participants p1 ON t1.player1_id = p1.id
        LEFT JOIN participants p2 ON t1.player2_id = p2.id
        LEFT JOIN participants p3 ON t2.player1_id = p3.id
        LEFT JOIN participants p4 ON t2.player2_id = p4.id
        WHERE m.group_id = ?
        ORDER BY m.id ASC
      `, group.id);

      groupsWithData.push({
        ...group,
        teams,
        matches
      });
    }

    stagesWithData.push({
      ...stage,
      groups: groupsWithData
    });
  }

  return c.json({ event, stages: stagesWithData });
});

// GET /api/events/:slug/matches/live
eventRoutes.get('/:slug/matches/live', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  const matches = await query(db, `
    SELECT m.*,
      t1.name AS team1_name, t2.name AS team2_name,
      p1.name AS team1_player1_name, p2.name AS team1_player2_name,
      p3.name AS team2_player1_name, p4.name AS team2_player2_name,
      s.scoring_type, s.points_to_win, s.deuce_allowed,
      g.name AS group_name, st.name AS stage_name
    FROM matches m
    JOIN stages s ON m.stage_id = s.id
    JOIN groups_t g ON m.group_id = g.id
    JOIN stages st ON m.stage_id = st.id
    LEFT JOIN teams t1 ON m.team1_id = t1.id
    LEFT JOIN teams t2 ON m.team2_id = t2.id
    LEFT JOIN participants p1 ON t1.player1_id = p1.id
    LEFT JOIN participants p2 ON t1.player2_id = p2.id
    LEFT JOIN participants p3 ON t2.player1_id = p3.id
    LEFT JOIN participants p4 ON t2.player2_id = p4.id
    WHERE s.event_id = ? AND m.status = 'live'
    ORDER BY m.id ASC
  `, slug);

  // Get point logs for each live match
  const result = [];
  for (const match of matches) {
    const points = await query(db, `
      SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC
    `, match.id);
    result.push({ ...match, points });
  }

  return c.json({ matches: result });
});

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

  // Construct public URL - use R2.dev domain
  const publicUrl = `${c.env.R2_PUBLIC_URL || `https://pub-${c.env.R2_BUCKET_URL || ''}`}/${key}`;
  
  // For dev, use a relative URL pattern
  const bannerUrl = `/api/banners/${key}`;

  await execute(db, 'UPDATE events SET banner_url = ? WHERE id = ?', bannerUrl, slug);

  return c.json({ banner_url: bannerUrl, key });
});



// GET /api/admin/events/:slug/share - return public URL
eventRoutes.get('/:slug/share', async (c) => {
  const { slug } = c.req.param();
  const origin = c.req.header('Origin') || `https://pickle-live.pages.dev`;
  const url = `${origin}/event/${slug}`;
  return c.json({ url });
});

export default eventRoutes;
