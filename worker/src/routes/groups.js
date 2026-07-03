/**
 * Group routes (admin only)
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const groupRoutes = new Hono();

// POST /api/admin/events/:slug/groups
groupRoutes.post('/:slug/groups', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const result = await execute(db,
    'INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)',
    slug, body.name, body.stage_type || 'round_robin', body.round_number || 1
  );

  const group = await queryOne(db, 'SELECT * FROM groups_t WHERE id = ?', result.meta.last_row_id);
  return c.json(group, 201);
});

// GET /api/admin/events/:slug/groups
groupRoutes.get('/:slug/groups', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const groups = await query(db,
    'SELECT * FROM groups_t WHERE event_id = ? ORDER BY name ASC', slug
  );

  // Get teams for each group
  const result = [];
  for (const group of groups) {
    const teams = await query(db, `
      SELECT t.*, 
        p1.name AS player1_name, p2.name AS player2_name
      FROM teams t
      JOIN group_teams gt ON t.id = gt.team_id
      LEFT JOIN participants p1 ON t.player1_id = p1.id
      LEFT JOIN participants p2 ON t.player2_id = p2.id
      WHERE gt.group_id = ?
    `, group.id);
    result.push({ ...group, teams });
  }

  return c.json(result);
});

// POST /api/admin/events/:slug/groups/:groupId/teams
groupRoutes.post('/:slug/groups/:groupId/teams', async (c) => {
  const { slug, groupId } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.team_id) {
    return c.json({ error: 'team_id is required' }, 400);
  }

  // Check group belongs to event
  const group = await queryOne(db, 'SELECT * FROM groups_t WHERE id = ? AND event_id = ?', groupId, slug);
  if (!group) {
    return c.json({ error: 'Group not found' }, 404);
  }

  // Check team belongs to event
  const team = await queryOne(db, 'SELECT id FROM teams WHERE id = ? AND event_id = ?', body.team_id, slug);
  if (!team) {
    return c.json({ error: 'Team not found in this event' }, 404);
  }

  // Check if already assigned
  const existing = await queryOne(db, 'SELECT * FROM group_teams WHERE group_id = ? AND team_id = ?', groupId, body.team_id);
  if (existing) {
    return c.json({ error: 'Team already in this group' }, 409);
  }

  await execute(db, 'INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)', groupId, body.team_id);
  return c.json({ success: true }, 201);
});

// DELETE /api/admin/events/:slug/groups/:groupId/teams/:teamId
groupRoutes.delete('/:slug/groups/:groupId/teams/:teamId', async (c) => {
  const { slug, groupId, teamId } = c.req.param();
  const db = c.env.DB;

  // Delete any matches for this team in this group
  await execute(db, 'DELETE FROM matches WHERE group_id = ? AND (team1_id = ? OR team2_id = ?)', groupId, teamId, teamId);
  await execute(db, 'DELETE FROM group_teams WHERE group_id = ? AND team_id = ?', groupId, teamId);

  return c.json({ success: true });
});

// DELETE /api/admin/events/:slug/groups/:id
groupRoutes.delete('/:slug/groups/:id', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;

  // Delete related matches, stage_groups, group_teams
  await execute(db, 'DELETE FROM matches WHERE group_id = ?', id);
  await execute(db, 'DELETE FROM stage_groups WHERE group_id = ?', id);
  await execute(db, 'DELETE FROM group_teams WHERE group_id = ?', id);
  await execute(db, 'DELETE FROM groups_t WHERE id = ? AND event_id = ?', id, slug);

  return c.json({ success: true });
});

export default groupRoutes;
