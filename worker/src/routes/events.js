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
    'INSERT INTO events (id, name, date, start_time, end_time, description, location, courts, format_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    slug, name, date, body.start_time || '', body.end_time || '', description || '', body.location || '', body.courts || '', 'royal_rumble'
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
  if (body.start_time !== undefined) { fields.push('start_time = ?'); values.push(body.start_time); }
  if (body.end_time !== undefined) { fields.push('end_time = ?'); values.push(body.end_time); }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }
  if (body.location !== undefined) { fields.push('location = ?'); values.push(body.location); }
  if (body.courts !== undefined) { fields.push('courts = ?'); values.push(body.courts); }

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

// DELETE /api/admin/events/:slug - delete an event and all related data
eventRoutes.delete('/:slug', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  const existing = await queryOne(db, 'SELECT id FROM events WHERE id = ?', slug);
  if (!existing) {
    return c.json({ error: 'Event not found' }, 404);
  }

  // Delete in dependency order
  await execute(db, 'DELETE FROM match_points WHERE match_id IN (SELECT id FROM matches WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?))', slug);
  await execute(db, 'DELETE FROM matches WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?)', slug);
  await execute(db, 'DELETE FROM stage_groups WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?)', slug);
  await execute(db, 'DELETE FROM stages WHERE event_id = ?', slug);
  await execute(db, 'DELETE FROM group_teams WHERE group_id IN (SELECT id FROM groups_t WHERE event_id = ?)', slug);
  await execute(db, 'DELETE FROM groups_t WHERE event_id = ?', slug);
  await execute(db, 'DELETE FROM participants WHERE event_id = ?', slug);
  await execute(db, 'DELETE FROM events WHERE id = ?', slug);

  return c.json({ success: true, message: 'Event deleted' });
});

// GET /api/admin/events/:slug/share - return public URL
eventRoutes.get('/:slug/share', async (c) => {
  const { slug } = c.req.param();
  const origin = c.req.header('Origin') || `https://pickle-live.pages.dev`;
  const url = `${origin}/event/${slug}`;
  return c.json({ url });
});

// POST /api/admin/events/:slug/copy - copy an entire event with all sub-data
eventRoutes.post('/:slug/copy', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();
  const { new_slug, name, date } = body;

  if (!new_slug || !name || !date) {
    return c.json({ error: 'new_slug, name, and date are required' }, 400);
  }

  // Check if new_slug already exists
  const existingNew = await queryOne(db, 'SELECT id FROM events WHERE id = ?', new_slug);
  if (existingNew) {
    return c.json({ error: 'An event with this slug already exists' }, 409);
  }

  // Read the source event
  const source = await queryOne(db, 'SELECT * FROM events WHERE id = ?', slug);
  if (!source) {
    return c.json({ error: 'Source event not found' }, 404);
  }

  // 1. Insert new event (same data, new slug/name/date)
  await execute(db,
    'INSERT INTO events (id, name, date, start_time, end_time, description, location, courts, format_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    new_slug, name, date, body.start_time || source.start_time || '', body.end_time || source.end_time || '', source.description || '', source.location || '', source.courts || '', source.format_type || ''
  );

  // 2. Copy participants (build old_id → new_id map)
  const participants = await query(db, 'SELECT * FROM participants WHERE event_id = ?', slug);
  const pMap = {};
  for (const p of participants) {
    const r = await execute(db,
      'INSERT INTO participants (event_id, name, gender, paddle, handedness, email, nickname, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      new_slug, p.name, p.gender, p.paddle, p.handedness, p.email, p.nickname || '', p.avatar || ''
    );
    pMap[p.id] = r.meta.last_row_id;
  }

  // 3. Copy teams (remap player1_id/player2_id)
  const teams = await query(db, 'SELECT * FROM teams WHERE event_id = ?', slug);
  const tMap = {};
  for (const t of teams) {
    const newP1 = pMap[t.player1_id];
    const newP2 = pMap[t.player2_id];
    if (!newP1 || !newP2) continue;
    const r = await execute(db,
      'INSERT INTO teams (event_id, name, player1_id, player2_id, emoji) VALUES (?, ?, ?, ?, ?)',
      new_slug, t.name, newP1, newP2, t.emoji || ''
    );
    tMap[t.id] = r.meta.last_row_id;
  }

  // 4. Copy groups_t
  const groups = await query(db, 'SELECT * FROM groups_t WHERE event_id = ?', slug);
  const gMap = {};
  for (const g of groups) {
    const r = await execute(db,
      'INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)',
      new_slug, g.name, g.stage_type, g.round_number
    );
    gMap[g.id] = r.meta.last_row_id;
  }

  // 5. Copy group_teams (remap group_id / team_id)
  for (const g of groups) {
    const gtRows = await query(db, 'SELECT * FROM group_teams WHERE group_id = ?', g.id);
    for (const gt of gtRows) {
      const ng = gMap[gt.group_id];
      const nt = tMap[gt.team_id];
      if (ng && nt) {
        await execute(db, 'INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)', ng, nt);
      }
    }
  }

  // 6. Copy stages
  const stages = await query(db, 'SELECT * FROM stages WHERE event_id = ?', slug);
  const sMap = {};
  for (const s of stages) {
    const r = await execute(db,
      'INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index) VALUES (?, ?, ?, ?, ?, ?)',
      new_slug, s.name, s.scoring_type, s.points_to_win, s.deuce_allowed, s.order_index
    );
    sMap[s.id] = r.meta.last_row_id;
  }

  // 7. Copy stage_groups (remap stage_id / group_id)
  for (const s of stages) {
    const sgRows = await query(db, 'SELECT * FROM stage_groups WHERE stage_id = ?', s.id);
    for (const sg of sgRows) {
      const ns = sMap[sg.stage_id];
      const ng = gMap[sg.group_id];
      if (ns && ng) {
        await execute(db, 'INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)', ns, ng);
      }
    }
  }

  // 8. Copy matches (reset scores/status, remap all IDs, don't copy match_points)
  const matches = await query(db, 'SELECT * FROM matches WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?)', slug);
  for (const m of matches) {
    const ns = sMap[m.stage_id];
    const ng = gMap[m.group_id];
    const nt1 = m.team1_id ? tMap[m.team1_id] : null;
    const nt2 = m.team2_id ? tMap[m.team2_id] : null;
    if (ns && ng) {
      await execute(db,
        `INSERT INTO matches (stage_id, group_id, team1_id, team2_id,
         team1_score, team2_score, scheduled_time, court, status, winner_team_id, walkover,
         current_server_team, current_server_player_id, current_server_side,
         current_server_number, starting_team_done,
         team1_player1_name, team1_player2_name, team2_player1_name, team2_player2_name)
         VALUES (?, ?, ?, ?, 0, 0, ?, ?, 'scheduled', NULL, 0, NULL, NULL, '', 1, 0, '', '', '', '')`,
        ns, ng, nt1, nt2, m.scheduled_time || '', m.court || ''
      );
    }
  }

  const newEvent = await queryOne(db, 'SELECT * FROM events WHERE id = ?', new_slug);
  return c.json({ event: newEvent }, 201);
});

export default eventRoutes;
