/**
 * Stage routes (admin only)
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const stageRoutes = new Hono();

// POST /api/admin/events/:slug/stages
stageRoutes.post('/:slug/stages', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  // Auto-increment order_index if not provided
  let orderIndex = body.order_index;
  if (orderIndex === undefined || orderIndex === null) {
    const maxOrder = await queryOne(db,
      'SELECT MAX(order_index) as max_idx FROM stages WHERE event_id = ?', slug
    );
    orderIndex = (maxOrder?.max_idx || 0) + 1;
  }

  const result = await execute(db,
    'INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index) VALUES (?, ?, ?, ?, ?, ?)',
    slug, body.name, body.scoring_type || 'rally', body.points_to_win || 15,
    body.deuce_allowed !== undefined ? (body.deuce_allowed ? 1 : 0) : 1,
    orderIndex
  );

  const stage = await queryOne(db, 'SELECT * FROM stages WHERE id = ?', result.meta.last_row_id);
  return c.json(stage, 201);
});

// GET /api/admin/events/:slug/stages
stageRoutes.get('/:slug/stages', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const stages = await query(db,
    'SELECT * FROM stages WHERE event_id = ? ORDER BY order_index ASC', slug
  );

  const result = [];
  for (const stage of stages) {
    const groups = await query(db, `
      SELECT g.* FROM groups_t g
      JOIN stage_groups sg ON g.id = sg.group_id
      WHERE sg.stage_id = ?
      ORDER BY g.name ASC
    `, stage.id);
    result.push({ ...stage, groups });
  }

  return c.json(result);
});

// POST /api/admin/events/:slug/stages/:stageId/groups
stageRoutes.post('/:slug/stages/:stageId/groups', async (c) => {
  const { slug, stageId } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  const stage = await queryOne(db, 'SELECT * FROM stages WHERE id = ? AND event_id = ?', stageId, slug);
  if (!stage) {
    return c.json({ error: 'Stage not found' }, 404);
  }

  const groupIds = body.group_ids || (body.group_id ? [body.group_id] : []);
  if (groupIds.length === 0) {
    return c.json({ error: 'group_ids is required' }, 400);
  }

  for (const gid of groupIds) {
    // Check group belongs to event
    const group = await queryOne(db, 'SELECT id FROM groups_t WHERE id = ? AND event_id = ?', gid, slug);
    if (!group) continue;

    // Check if already assigned
    const existing = await queryOne(db, 'SELECT * FROM stage_groups WHERE stage_id = ? AND group_id = ?', stageId, gid);
    if (!existing) {
      await execute(db, 'INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)', stageId, gid);
    }
  }

  return c.json({ success: true });
});

// DELETE /api/admin/events/:slug/stages/:id
stageRoutes.delete('/:slug/stages/:id', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;

  // Delete matches in this stage
  await execute(db, 'DELETE FROM matches WHERE stage_id = ?', id);
  await execute(db, 'DELETE FROM stage_groups WHERE stage_id = ?', id);
  await execute(db, 'DELETE FROM stages WHERE id = ? AND event_id = ?', id, slug);

  return c.json({ success: true });
});

export default stageRoutes;
