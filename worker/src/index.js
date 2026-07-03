/**
 * Pickle-Live API - Cloudflare Worker using Hono
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requireAdmin } from './auth.js';
import { query, queryOne } from './db.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import participantRoutes from './routes/participants.js';
import teamRoutes from './routes/teams.js';
import groupRoutes from './routes/groups.js';
import stageRoutes from './routes/stages.js';
import matchRoutes from './routes/matches.js';
import playerRoutes from './routes/players.js';
import formatRoutes from './routes/format.js';
import venueRoutes from './routes/venues.js';

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

// GET /api/players - global deduplicated player list (across all events)
app.get('/api/players', async (c) => {
  const db = c.env.DB;
  const players = await query(db, `
    SELECT 
      MIN(id) AS id,
      name,
      COALESCE(NULLIF(nickname, ''), name) AS display_nickname,
      gender, paddle, handedness, email, avatar,
      COUNT(*) AS event_count,
      GROUP_CONCAT(DISTINCT event_id) AS event_ids
    FROM participants
    GROUP BY name
    ORDER BY name ASC
  `);
  return c.json(players);
});

// Auth routes (public)
app.route('/api/auth', authRoutes);

// Event banner serving (public) - R2 keys stored as banners/<filename>
app.get('/api/banners/*', async (c) => {
  const filename = c.req.path.replace('/api/banners/', '');
  const bucket = c.env.BUCKET;
  if (!bucket) return c.json({ error: 'Storage not configured' }, 500);
  try {
    // Keys are stored with a banners/ prefix in R2 for organization
    const obj = await bucket.get(`banners/${filename}`);
    if (!obj) return c.json({ error: 'Not found' }, 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000');
    return new Response(obj.body, { headers });
  } catch (err) {
    return c.json({ error: 'Not found' }, 404);
  }
});

// GET /api/events - list all events (for landing page)
app.get('/api/events', async (c) => {
  const db = c.env.DB;
  const events = await query(db, 'SELECT * FROM events ORDER BY date DESC');
  const now = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= now);
  const past = events.filter(e => e.date < now);
  return c.json({ upcoming, past, all: events });
});

// Public event routes
app.get('/api/events/:slug', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  const event = await queryOne(db, 'SELECT * FROM events WHERE id = ?', slug);
  if (!event) return c.json({ error: 'Event not found' }, 404);

  // All participants for this event (for Players tab in Royal Rumble format)
  const allParticipants = await query(db,
    'SELECT * FROM participants WHERE event_id = ? ORDER BY name ASC', slug
  );

  // All teams for this event (with player details) — always returned for Teams tab
  const allTeams = await query(db, `
    SELECT t.*, 
      p1.name AS player1_name, COALESCE(p1.nickname, p1.name) AS player1_nickname, p1.gender AS player1_gender, p1.handedness AS player1_handedness, p1.paddle AS player1_paddle,
      p2.name AS player2_name, COALESCE(p2.nickname, p2.name) AS player2_nickname, p2.gender AS player2_gender, p2.handedness AS player2_handedness, p2.paddle AS player2_paddle
    FROM teams t
    LEFT JOIN participants p1 ON t.player1_id = p1.id
    LEFT JOIN participants p2 ON t.player2_id = p2.id
    WHERE t.event_id = ?
    ORDER BY t.name ASC
  `, slug);

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
          p1.name AS player1_name, COALESCE(p1.nickname, p1.name) AS player1_nickname, p1.gender AS player1_gender,
          p1.paddle AS player1_paddle, p1.handedness AS player1_handedness,
          p2.name AS player2_name, COALESCE(p2.nickname, p2.name) AS player2_nickname, p2.gender AS player2_gender,
          p2.paddle AS player2_paddle, p2.handedness AS player2_handedness
        FROM teams t
        JOIN group_teams gt ON t.id = gt.team_id
        LEFT JOIN participants p1 ON t.player1_id = p1.id
        LEFT JOIN participants p2 ON t.player2_id = p2.id
        WHERE gt.group_id = ?
      `, group.id);

      const matches = await query(db, `
        SELECT m.*,
          t1.name AS team1_name, t2.name AS team2_name,
          COALESCE(NULLIF(m.team1_player1_name,''), p1.name) AS team1_player1_name, COALESCE(p1.nickname, p1.name) AS team1_player1_nickname, p1.gender AS team1_player1_gender, p1.handedness AS team1_player1_handedness,
          COALESCE(NULLIF(m.team1_player2_name,''), p2.name) AS team1_player2_name, COALESCE(p2.nickname, p2.name) AS team1_player2_nickname, p2.gender AS team1_player2_gender, p2.handedness AS team1_player2_handedness,
          COALESCE(NULLIF(m.team2_player1_name,''), p3.name) AS team2_player1_name, COALESCE(p3.nickname, p3.name) AS team2_player1_nickname, p3.gender AS team2_player1_gender, p3.handedness AS team2_player1_handedness,
          COALESCE(NULLIF(m.team2_player2_name,''), p4.name) AS team2_player2_name, COALESCE(p4.nickname, p4.name) AS team2_player2_nickname, p4.gender AS team2_player2_gender, p4.handedness AS team2_player2_handedness
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

  return c.json({ event, stages: stagesWithData, allTeams, allParticipants });
});

// GET /api/events/:slug/matches/live - public
app.get('/api/events/:slug/matches/live', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  const matches = await query(db, `
    SELECT m.*,
      t1.name AS team1_name, t2.name AS team2_name,
      COALESCE(NULLIF(m.team1_player1_name,''), p1.name) AS team1_player1_name, COALESCE(p1.nickname, p1.name) AS team1_player1_nickname, p1.gender AS team1_player1_gender, p1.handedness AS team1_player1_handedness,
      COALESCE(NULLIF(m.team1_player2_name,''), p2.name) AS team1_player2_name, COALESCE(p2.nickname, p2.name) AS team1_player2_nickname, p2.gender AS team1_player2_gender, p2.handedness AS team1_player2_handedness,
      COALESCE(NULLIF(m.team2_player1_name,''), p3.name) AS team2_player1_name, COALESCE(p3.nickname, p3.name) AS team2_player1_nickname, p3.gender AS team2_player1_gender, p3.handedness AS team2_player1_handedness,
      COALESCE(NULLIF(m.team2_player2_name,''), p4.name) AS team2_player2_name, COALESCE(p4.nickname, p4.name) AS team2_player2_nickname, p4.gender AS team2_player2_gender, p4.handedness AS team2_player2_handedness,
      s.scoring_type, s.points_to_win, s.deuce_allowed,
      g.name AS group_name,
      s.name AS stage_name
    FROM matches m
    JOIN stages s ON m.stage_id = s.id
    JOIN groups_t g ON m.group_id = g.id
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

// GET /api/events/:slug/standings - public standings (team + player)
app.get('/api/events/:slug/standings', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  const event = await queryOne(db, 'SELECT format_type FROM events WHERE id = ?', slug);
  if (!event) return c.json({ error: 'Event not found' }, 404);

  const isRoyalRumble = event.format_type === 'royal_rumble';

  // Get all completed matches — use COALESCE to fall back to current team players if frozen names are empty
  const matches = await query(db, `
    SELECT m.*,
      t1.name AS team1_name, t2.name AS team2_name,
      COALESCE(NULLIF(m.team1_player1_name,''), p1.name) AS team1_player1_name,
      COALESCE(NULLIF(m.team1_player2_name,''), p2.name) AS team1_player2_name,
      COALESCE(NULLIF(m.team2_player1_name,''), p3.name) AS team2_player1_name,
      COALESCE(NULLIF(m.team2_player2_name,''), p4.name) AS team2_player2_name
    FROM matches m
    JOIN stages s ON m.stage_id = s.id
    LEFT JOIN teams t1 ON m.team1_id = t1.id
    LEFT JOIN teams t2 ON m.team2_id = t2.id
    LEFT JOIN participants p1 ON t1.player1_id = p1.id
    LEFT JOIN participants p2 ON t1.player2_id = p2.id
    LEFT JOIN participants p3 ON t2.player1_id = p3.id
    LEFT JOIN participants p4 ON t2.player2_id = p4.id
    WHERE s.event_id = ? AND m.status = 'completed'
  `, slug);

  // Always compute player-level standings from frozen names
  const playerMap = new Map();
  for (const m of matches) {
    const team1Players = [m.team1_player1_name, m.team1_player2_name].filter(Boolean);
    const team2Players = [m.team2_player1_name, m.team2_player2_name].filter(Boolean);
    const team1Won = m.winner_team_id === m.team1_id;
    const team2Won = m.winner_team_id === m.team2_id;

    for (const name of team1Players) {
      if (!playerMap.has(name)) playerMap.set(name, { name, played: 0, wins: 0, losses: 0, pf: 0, pa: 0 });
      const p = playerMap.get(name);
      p.played++;
      p.pf += m.team1_score;
      p.pa += m.team2_score;
      if (team1Won) p.wins++;
      else if (team2Won) p.losses++;
    }
    for (const name of team2Players) {
      if (!playerMap.has(name)) playerMap.set(name, { name, played: 0, wins: 0, losses: 0, pf: 0, pa: 0 });
      const p = playerMap.get(name);
      p.played++;
      p.pf += m.team2_score;
      p.pa += m.team1_score;
      if (team2Won) p.wins++;
      else if (team1Won) p.losses++;
    }
  }

  const playerStandings = Array.from(playerMap.values())
    .map(p => ({ ...p, diff: p.pf - p.pa }))
    .sort((a, b) => b.wins - a.wins || b.diff - a.diff || b.pf - a.pf);

  if (isRoyalRumble) {
    return c.json({ player_standings: playerStandings, team_standings: [] });
  }

  // Team-level standings
  const teamMap = new Map();
  for (const m of matches) {
    if (!m.team1_id || !m.team2_id) continue;
    for (const [teamId, teamName, score, oppScore, isWinner] of [
      [m.team1_id, m.team1_name, m.team1_score, m.team2_score, m.winner_team_id === m.team1_id],
      [m.team2_id, m.team2_name, m.team2_score, m.team1_score, m.winner_team_id === m.team2_id],
    ]) {
      if (!teamMap.has(teamId)) teamMap.set(teamId, { team_id: teamId, team_name: teamName, played: 0, wins: 0, losses: 0, pf: 0, pa: 0 });
      const t = teamMap.get(teamId);
      t.played++;
      t.pf += score;
      t.pa += oppScore;
      if (isWinner) t.wins++;
      else t.losses++;
    }
  }

  // Fetch player details for each team
  const teamIds = Array.from(teamMap.keys());
  if (teamIds.length > 0) {
    const placeholders = teamIds.map(() => '?').join(',');
    const teamPlayers = await query(db, `
      SELECT t.id AS team_id,
        p1.name AS player1_name, COALESCE(p1.nickname, p1.name) AS player1_nickname, p1.gender AS player1_gender,
        p2.name AS player2_name, COALESCE(p2.nickname, p2.name) AS player2_nickname, p2.gender AS player2_gender
      FROM teams t
      LEFT JOIN participants p1 ON t.player1_id = p1.id
      LEFT JOIN participants p2 ON t.player2_id = p2.id
      WHERE t.id IN (${placeholders})
    `, ...teamIds);
    for (const tp of teamPlayers) {
      if (teamMap.has(tp.team_id)) {
        Object.assign(teamMap.get(tp.team_id), {
          player1_name: tp.player1_name,
          player1_nickname: tp.player1_nickname,
          player1_gender: tp.player1_gender,
          player2_name: tp.player2_name,
          player2_nickname: tp.player2_nickname,
          player2_gender: tp.player2_gender,
        });
      }
    }
  }

  const teamStandings = Array.from(teamMap.values())
    .map(t => ({ ...t, diff: t.pf - t.pa }))
    .sort((a, b) => b.wins - a.wins || b.diff - a.diff || b.pf - a.pf);

  return c.json({ player_standings: playerStandings, team_standings: teamStandings });
});

// GET /api/events/:slug/matches/:id/points - public match point log
app.get('/api/events/:slug/matches/:id/points', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;

  // Verify match belongs to event
  const match = await queryOne(db, `
    SELECT m.id FROM matches m
    JOIN stages s ON m.stage_id = s.id
    WHERE s.event_id = ? AND m.id = ?
  `, slug, id);

  if (!match) return c.json({ error: 'Match not found' }, 404);

  const points = await query(db, `
    SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC
  `, id);

  return c.json({ points });
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
app.route('/api/admin/events', formatRoutes);
app.route('/api/admin/venues', venueRoutes);
app.route('/api/admin/players', playerRoutes);

// (GET list endpoints are handled in the route files above)

// Catch-all
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error', details: err.message }, 500);
});

export default app;
