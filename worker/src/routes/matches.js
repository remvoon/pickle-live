/**
 * Match routes (admin only for most) - includes scoring logic
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const matchRoutes = new Hono();

// Helper: get server and side based on team score parity
// Player1 serves when team score is even (serves from right)
// Player2 serves when team score is odd (serves from left)
function getServerAndSide(team, score) {
  if (score % 2 === 0) {
    return { serverPlayerId: team.player1_id, side: 'right' };
  } else {
    return { serverPlayerId: team.player2_id, side: 'left' };
  }
}

// Helper: determine if match is complete
function isMatchComplete(team1Score, team2Score, pointsToWin, deuceAllowed) {
  const maxScore = Math.max(team1Score, team2Score);
  const minScore = Math.min(team1Score, team2Score);
  
  if (maxScore < pointsToWin) return false;
  
  if (deuceAllowed) {
    return (maxScore - minScore) >= 2;
  } else {
    return maxScore >= pointsToWin;
  }
}

// Helper: recompute match state from point log
function recomputeMatchState(points, stageScoringType) {
  let team1Score = 0;
  let team2Score = 0;
  let currentServerTeam = 1; // team1 serves first
  let currentServerPlayerId = null;
  let currentServerSide = 'right';

  for (const point of points) {
    const scoringType = point.scoring_type_at_time || stageScoringType;
    const rallyWinner = point.rally_winner_team; // 1 or 2
    const servingTeam = currentServerTeam;
    
    if (scoringType === 'rally') {
      // Every rally awards a point
      if (rallyWinner === 1) {
        team1Score += 1;
      } else {
        team2Score += 1;
      }
      // Serving team changes if they lost the rally (side-out in rally scoring)
      // Actually in rally scoring, the winner of the rally serves next
      currentServerTeam = rallyWinner;
    } else {
      // Side-out scoring
      if (rallyWinner === servingTeam) {
        // Serving team won the rally - they score
        if (servingTeam === 1) team1Score += 1;
        else team2Score += 1;
        // Same team continues serving
        currentServerTeam = servingTeam;
      } else {
        // Receiving team won - side-out, no score change
        currentServerTeam = rallyWinner; // Other team gets serve
      }
    }
  }

  // Compute current server and side based on final state
  // We need team player info - that's returned separately
  return { team1Score, team2Score, currentServerTeam };
}

// Helper: get full team data including players
async function getTeamData(db, teamId) {
  return await queryOne(db, `
    SELECT t.*, 
      p1.name AS player1_name, p1.gender AS player1_gender, p1.paddle AS player1_paddle, p1.handedness AS player1_handedness,
      p2.name AS player2_name, p2.gender AS player2_gender, p2.paddle AS player2_paddle, p2.handedness AS player2_handedness
    FROM teams t
    LEFT JOIN participants p1 ON t.player1_id = p1.id
    LEFT JOIN participants p2 ON t.player2_id = p2.id
    WHERE t.id = ?
  `, teamId);
}

// GET /api/admin/events/:slug/matches - list all matches for an event
matchRoutes.get('/:slug/matches', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  const matches = await query(db, `
    SELECT m.*,
      t1.name AS team1_name, t2.name AS team2_name,
      p1.name AS team1_player1_name, p2.name AS team1_player2_name,
      p3.name AS team2_player1_name, p4.name AS team2_player2_name,
      s.name AS stage_name, s.scoring_type, s.points_to_win, s.deuce_allowed,
      g.name AS group_name
    FROM matches m
    JOIN stages s ON m.stage_id = s.id
    JOIN groups_t g ON m.group_id = g.id
    LEFT JOIN teams t1 ON m.team1_id = t1.id
    LEFT JOIN teams t2 ON m.team2_id = t2.id
    LEFT JOIN participants p1 ON t1.player1_id = p1.id
    LEFT JOIN participants p2 ON t1.player2_id = p2.id
    LEFT JOIN participants p3 ON t2.player1_id = p3.id
    LEFT JOIN participants p4 ON t2.player2_id = p4.id
    WHERE s.event_id = ?
    ORDER BY m.id ASC
  `, slug);

  return c.json(matches);
});

// POST /api/admin/events/:slug/matches - create match
matchRoutes.post('/:slug/matches', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.team1_id || !body.team2_id || !body.stage_id || !body.group_id) {
    return c.json({ error: 'team1_id, team2_id, stage_id, and group_id are required' }, 400);
  }

  if (body.team1_id === body.team2_id) {
    return c.json({ error: 'A team cannot play against itself' }, 400);
  }

  const result = await execute(db,
    `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, scheduled_time, court, status)
     VALUES (?, ?, ?, ?, ?, ?, 'scheduled')`,
    body.stage_id, body.group_id, body.team1_id, body.team2_id,
    body.scheduled_time || '', body.court || ''
  );

  const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', result.meta.last_row_id);
  return c.json(match, 201);
});

// POST /api/admin/events/:slug/matches/auto-generate
matchRoutes.post('/:slug/matches/auto-generate', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.group_id || !body.stage_id) {
    return c.json({ error: 'group_id and stage_id are required' }, 400);
  }

  // Verify group and stage belong to event
  const group = await queryOne(db, 'SELECT * FROM groups_t WHERE id = ? AND event_id = ?', body.group_id, slug);
  if (!group) return c.json({ error: 'Group not found' }, 404);

  const stage = await queryOne(db, 'SELECT * FROM stages WHERE id = ? AND event_id = ?', body.stage_id, slug);
  if (!stage) return c.json({ error: 'Stage not found' }, 404);

  // Get all teams in the group
  const teams = await query(db, `
    SELECT t.* FROM teams t
    JOIN group_teams gt ON t.id = gt.team_id
    WHERE gt.group_id = ?
  `, body.group_id);

  if (teams.length < 2) {
    return c.json({ error: 'Need at least 2 teams in the group' }, 400);
  }

  // Generate all unique pairings
  const createdMatches = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const result = await execute(db,
        `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status)
         VALUES (?, ?, ?, ?, 'scheduled')`,
        body.stage_id, body.group_id, teams[i].id, teams[j].id
      );
      const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', result.meta.last_row_id);
      createdMatches.push(match);
    }
  }

  return c.json(createdMatches, 201);
});

// PUT /api/admin/events/:slug/matches/:id
matchRoutes.put('/:slug/matches/:id', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  const existing = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  // Also verify via stage -> event
  const stage = await queryOne(db, 'SELECT * FROM stages WHERE id = ? AND event_id = ?', existing?.stage_id, slug);
  if (!existing || !stage) {
    return c.json({ error: 'Match not found' }, 404);
  }

  const fields = [];
  const values = [];
  if (body.team1_id !== undefined) { fields.push('team1_id = ?'); values.push(body.team1_id); }
  if (body.team2_id !== undefined) { fields.push('team2_id = ?'); values.push(body.team2_id); }
  if (body.scheduled_time !== undefined) { fields.push('scheduled_time = ?'); values.push(body.scheduled_time); }
  if (body.court !== undefined) { fields.push('court = ?'); values.push(body.court); }

  if (fields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  values.push(id);
  await execute(db, `UPDATE matches SET ${fields.join(', ')} WHERE id = ?`, ...values);

  const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  return c.json(match);
});

// DELETE /api/admin/events/:slug/matches/:id
matchRoutes.delete('/:slug/matches/:id', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;

  // Check if match has points
  const pointCount = await queryOne(db, 'SELECT COUNT(*) as cnt FROM match_points WHERE match_id = ?', id);
  if (pointCount.cnt > 0) {
    return c.json({ error: 'Cannot delete match with recorded points. Undo points first.' }, 409);
  }

  await execute(db, 'DELETE FROM matches WHERE id = ?', id);
  return c.json({ success: true });
});

// POST /api/admin/events/:slug/matches/:id/start
matchRoutes.post('/:slug/matches/:id/start', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;

  const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  if (!match) return c.json({ error: 'Match not found' }, 404);

  // Set initial server: team1 serves first, player based on score (0 = even = player1, right side)
  const team1 = await getTeamData(db, match.team1_id);
  const { serverPlayerId, side } = getServerAndSide(team1, 0);

  await execute(db,
    `UPDATE matches SET status = 'live', current_server_team = 1, current_server_player_id = ?, current_server_side = ? WHERE id = ?`,
    serverPlayerId, side, id
  );

  const updated = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  return c.json(updated);
});

// POST /api/admin/events/:slug/matches/:id/point
matchRoutes.post('/:slug/matches/:id/point', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.rally_winner_team || ![1, 2].includes(body.rally_winner_team)) {
    return c.json({ error: 'rally_winner_team must be 1 or 2' }, 400);
  }

  const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  if (!match || match.status !== 'live') {
    return c.json({ error: 'Match is not live' }, 400);
  }

  const stage = await queryOne(db, 'SELECT * FROM stages WHERE id = ?', match.stage_id);
  if (!stage) return c.json({ error: 'Stage not found' }, 404);

  const team1 = await getTeamData(db, match.team1_id);
  const team2 = await getTeamData(db, match.team2_id);
  if (!team1 || !team2) return c.json({ error: 'Teams not found' }, 404);

  const scoringType = stage.scoring_type;
  const rallyWinner = body.rally_winner_team;
  const servingTeam = match.current_server_team || 1;
  
  const team1ScoreBefore = match.team1_score || 0;
  const team2ScoreBefore = match.team2_score || 0;

  let sideOut = 0;
  let newTeam1Score = team1ScoreBefore;
  let newTeam2Score = team2ScoreBefore;
  let newServingTeam = servingTeam;

  if (scoringType === 'rally') {
    // Every rally awards a point to the winner
    if (rallyWinner === 1) newTeam1Score += 1;
    else newTeam2Score += 1;
    // Winner serves next
    newServingTeam = rallyWinner;
  } else {
    // Side-out scoring
    if (rallyWinner === servingTeam) {
      // Serving team won - they score
      if (servingTeam === 1) newTeam1Score += 1;
      else newTeam2Score += 1;
      newServingTeam = servingTeam;
    } else {
      // Receiving team won - side-out, no score
      sideOut = 1;
      newServingTeam = rallyWinner;
    }
  }

  // Check if match is complete
  if (isMatchComplete(newTeam1Score, newTeam2Score, stage.points_to_win, stage.deuce_allowed)) {
    // Match is over - set to completed
    const winnerTeam = newTeam1Score > newTeam2Score ? match.team1_id : match.team2_id;
    
    // Record the point first
    const pointNumber = await getNextPointNumber(db, id);
    const serverPlayerId = body.server_player_id || match.current_server_player_id;
    const serverSide = body.server_side || match.current_server_side || 'right';
    
    await execute(db,
      `INSERT INTO match_points (match_id, point_number, team1_score_before, team2_score_before, rally_winner_team, server_player_id, server_side, scoring_type_at_time, side_out)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, pointNumber, team1ScoreBefore, team2ScoreBefore, rallyWinner, serverPlayerId, serverSide, scoringType, sideOut
    );

    await execute(db,
      `UPDATE matches SET status = 'completed', team1_score = ?, team2_score = ?, winner_team_id = ? WHERE id = ?`,
      newTeam1Score, newTeam2Score, winnerTeam, id
    );

    const updated = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
    const points = await query(db, 'SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC', id);
    return c.json({ match: updated, points, match_completed: true });
  }

  // Determine server for next rally
  let nextServerPlayerId, nextServerSide;
  if (newServingTeam === 1) {
    const serverInfo = getServerAndSide(team1, newTeam1Score);
    nextServerPlayerId = serverInfo.serverPlayerId;
    nextServerSide = serverInfo.side;
  } else {
    const serverInfo = getServerAndSide(team2, newTeam2Score);
    nextServerPlayerId = serverInfo.serverPlayerId;
    nextServerSide = serverInfo.side;
  }

  // Use provided server info if given (admin override), otherwise computed
  const serverPlayerId = body.server_player_id || match.current_server_player_id;
  const serverSide = body.server_side || match.current_server_side || 'right';

  // Record the point
  const pointNumber = await getNextPointNumber(db, id);
  await execute(db,
    `INSERT INTO match_points (match_id, point_number, team1_score_before, team2_score_before, rally_winner_team, server_player_id, server_side, scoring_type_at_time, side_out)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, pointNumber, team1ScoreBefore, team2ScoreBefore, rallyWinner, serverPlayerId, serverSide, scoringType, sideOut
  );

  // Update match with new scores and next server
  await execute(db,
    `UPDATE matches SET team1_score = ?, team2_score = ?, current_server_team = ?, current_server_player_id = ?, current_server_side = ? WHERE id = ?`,
    newTeam1Score, newTeam2Score, newServingTeam, nextServerPlayerId, nextServerSide, id
  );

  const updated = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  const points = await query(db, 'SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC', id);
  
  return c.json({
    match: updated,
    points,
    side_out: sideOut === 1,
    next_server: {
      team: newServingTeam,
      player_id: nextServerPlayerId,
      side: nextServerSide
    }
  });
});

// POST /api/admin/events/:slug/matches/:id/undo
matchRoutes.post('/:slug/matches/:id/undo', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;

  // Get last point
  const lastPoint = await queryOne(db,
    'SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number DESC LIMIT 1', id
  );
  if (!lastPoint) {
    return c.json({ error: 'No points to undo' }, 400);
  }

  // Delete last point
  await execute(db, 'DELETE FROM match_points WHERE id = ?', lastPoint.id);

  // Recompute match state from remaining points
  const remainingPoints = await query(db,
    'SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC', id
  );
  
  const stage = await queryOne(db, 'SELECT * FROM stages WHERE id = ?', 
    (await queryOne(db, 'SELECT stage_id FROM matches WHERE id = ?', id))?.stage_id
  );
  if (!stage) return c.json({ error: 'Stage not found' }, 404);

  const scoringType = stage.scoring_type;
  const state = recomputeMatchState(remainingPoints, scoringType);

  // Get team data for server computation
  const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  const team1 = match ? await getTeamData(db, match.team1_id) : null;
  const team2 = match ? await getTeamData(db, match.team2_id) : null;

  let nextServerPlayerId, nextServerSide;
  if (state.currentServerTeam === 1 && team1) {
    const si = getServerAndSide(team1, state.team1Score);
    nextServerPlayerId = si.serverPlayerId;
    nextServerSide = si.side;
  } else if (team2) {
    const si = getServerAndSide(team2, state.team2Score);
    nextServerPlayerId = si.serverPlayerId;
    nextServerSide = si.side;
  } else {
    nextServerPlayerId = null;
    nextServerSide = 'right';
  }

  // Update match
  await execute(db,
    `UPDATE matches SET team1_score = ?, team2_score = ?, current_server_team = ?, current_server_player_id = ?, current_server_side = ? WHERE id = ?`,
    state.team1Score, state.team2Score, state.currentServerTeam, nextServerPlayerId, nextServerSide, id
  );

  const updated = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  const points = await query(db, 'SELECT * FROM match_points WHERE match_id = ? ORDER BY point_number ASC', id);

  return c.json({ match: updated, points });
});

// POST /api/admin/events/:slug/matches/:id/complete
matchRoutes.post('/:slug/matches/:id/complete', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  if (!match) return c.json({ error: 'Match not found' }, 404);

  const winnerTeamId = body.winner_team_id || 
    ((match.team1_score || 0) > (match.team2_score || 0) ? match.team1_id : match.team2_id);

  await execute(db,
    `UPDATE matches SET status = 'completed', winner_team_id = ?, walkover = ? WHERE id = ?`,
    winnerTeamId, body.walkover ? 1 : 0, id
  );

  const updated = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  return c.json(updated);
});

// POST /api/admin/events/:slug/matches/:id/walkover
matchRoutes.post('/:slug/matches/:id/walkover', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  if (!body.winner_team_id) {
    return c.json({ error: 'winner_team_id is required' }, 400);
  }

  const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  if (!match) return c.json({ error: 'Match not found' }, 404);

  await execute(db,
    `UPDATE matches SET status = 'completed', winner_team_id = ?, walkover = 1 WHERE id = ?`,
    body.winner_team_id, id
  );

  const updated = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  return c.json(updated);
});

// Helper
async function getNextPointNumber(db, matchId) {
  const result = await queryOne(db,
    'SELECT MAX(point_number) as max_pn FROM match_points WHERE match_id = ?', matchId
  );
  return (result?.max_pn || 0) + 1;
}

// POST /api/admin/events/:slug/matches/advance - advance teams from group stage to knockout
matchRoutes.post('/:slug/matches/advance', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  // body: { sourceStageId, targetStageId, targetGroupId, pairings: [{ team1_id, team2_id }] }
  if (!body.targetStageId || !body.targetGroupId || !body.pairings) {
    return c.json({ error: 'targetStageId, targetGroupId, and pairings are required' }, 400);
  }

  const createdMatches = [];
  for (const pairing of body.pairings) {
    if (!pairing.team1_id || !pairing.team2_id) continue;
    const result = await execute(db,
      `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status) VALUES (?, ?, ?, ?, 'scheduled')`,
      body.targetStageId, body.targetGroupId, pairing.team1_id, pairing.team2_id
    );
    const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', result.meta.last_row_id);
    createdMatches.push(match);
  }

  return c.json(createdMatches, 201);
});

export default matchRoutes;
