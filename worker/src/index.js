/**
 * Pickle-Live API - Cloudflare Worker using Hono
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requireAdmin } from './auth.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import participantRoutes from './routes/participants.js';
import teamRoutes from './routes/teams.js';
import groupRoutes from './routes/groups.js';
import stageRoutes from './routes/stages.js';
import matchRoutes from './routes/matches.js';

const app = new Hono();

// CORS
app.use('/*', cors({
  origin: (origin, c) => {
    const allowed = c.env.ALLOWED_ORIGINS || '*';
    if (allowed === '*' || !origin) return '*';
    const origins = allowed.split(',').map(o => o.trim());
    if (origins.includes(origin)) return origin;
    if (origins.includes('*')) return '*';
    return origin;
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Auth routes (public)
app.route('/api/auth', authRoutes);

// Event banner serving (public)
app.get('/api/banners/*', async (c) => {
  const path = c.req.path.replace('/api/banners/', '');
  const bucket = c.env.BUCKET;
  if (!bucket) return c.json({ error: 'Storage not configured' }, 500);
  try {
    const obj = await bucket.get(path);
    if (!obj) return c.json({ error: 'Not found' }, 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000');
    return new Response(obj.body, { headers });
  } catch (err) {
    return c.json({ error: 'Not found' }, 404);
  }
});

// Public event routes
app.get('/api/events/:slug', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  
  // Reuse logic from eventRoutes
  const { query, queryOne } = await import('./db.js');
  const event = await queryOne(db, 'SELECT * FROM events WHERE id = ?', slug);
  if (!event) return c.json({ error: 'Event not found' }, 404);

  const stages = await query(db, 'SELECT * FROM stages WHERE event_id = ? ORDER BY order_index ASC', slug);
  
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
          p1.name AS player1_name, p1.gender AS player1_gender,
          p2.name AS player2_name, p2.gender AS player2_gender
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

      groupsWithData.push({ ...group, teams, matches });
    }

    stagesWithData.push({ ...stage, groups: groupsWithData });
  }

  return c.json({ event, stages: stagesWithData });
});

// GET /api/events/:slug/matches/live - public
app.get('/api/events/:slug/matches/live', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  
  const { query } = await import('./db.js');
  
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

  const result = [];
  for (const match of matches) {
    const points = await query(db, `
      SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC
    `, match.id);
    result.push({ ...match, points });
  }

  return c.json({ matches: result });
});

// Admin routes (all require auth)
app.use('/api/admin/*', async (c, next) => {
  const authMiddleware = requireAdmin(c.env);
  return authMiddleware(c, next);
});

// Admin sub-routes
app.route('/api/admin/events', eventRoutes);
app.route('/api/admin/events', participantRoutes);
app.route('/api/admin/events', teamRoutes);
app.route('/api/admin/events', groupRoutes);
app.route('/api/admin/events', stageRoutes);
app.route('/api/admin/events', matchRoutes);

// (GET list endpoints are handled in the route files above)

// Catch-all
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error', details: err.message }, 500);
});

export default app;
