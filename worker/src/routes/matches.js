/**
 * Match routes (admin only for most) - includes scoring logic
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';
import { getServerAndSide, isMatchComplete, recomputeMatchState } from '../scoring.js';

const matchRoutes = new Hono();

// Helper: add minutes to an ISO datetime string
function addMinutes(isoString, minutes) {
  if (!isoString || minutes === 0) return isoString;
  const d = new Date(isoString);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Helper: get full team data including players
async function getTeamData(db, teamId) {
  return await queryOne(db, `
    SELECT t.*, 
      p1.name AS player1_name, COALESCE(p1.nickname, p1.name) AS player1_nickname, p1.gender AS player1_gender, p1.paddle AS player1_paddle, p1.handedness AS player1_handedness,
      p2.name AS player2_name, COALESCE(p2.nickname, p2.name) AS player2_nickname, p2.gender AS player2_gender, p2.paddle AS player2_paddle, p2.handedness AS player2_handedness
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
      COALESCE(NULLIF(m.team1_player1_name,''), p1.name) AS team1_player1_name, COALESCE(p1.nickname, p1.name) AS team1_player1_nickname, p1.gender AS team1_player1_gender, p1.handedness AS team1_player1_handedness,
      COALESCE(NULLIF(m.team1_player2_name,''), p2.name) AS team1_player2_name, COALESCE(p2.nickname, p2.name) AS team1_player2_nickname, p2.gender AS team1_player2_gender, p2.handedness AS team1_player2_handedness,
      COALESCE(NULLIF(m.team2_player1_name,''), p3.name) AS team2_player1_name, COALESCE(p3.nickname, p3.name) AS team2_player1_nickname, p3.gender AS team2_player1_gender, p3.handedness AS team2_player1_handedness,
      COALESCE(NULLIF(m.team2_player2_name,''), p4.name) AS team2_player2_name, COALESCE(p4.nickname, p4.name) AS team2_player2_nickname, p4.gender AS team2_player2_gender, p4.handedness AS team2_player2_handedness,
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

  // Get player names to freeze in the match record
  const t1 = await getTeamData(db, body.team1_id);
  const t2 = await getTeamData(db, body.team2_id);

  const result = await execute(db,
    `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, scheduled_time, court, status,
     team1_player1_name, team1_player2_name, team2_player1_name, team2_player2_name)
     VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)`,
    body.stage_id, body.group_id, body.team1_id, body.team2_id,
    body.scheduled_time || '', body.court || '',
    t1?.player1_name || '', t1?.player2_name || '',
    t2?.player1_name || '', t2?.player2_name || ''
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

  // Generate all unique pairings with staggered times
  const courts = body.courts || [];
  const scheduledTime = body.scheduled_time || new Date().toISOString().split('T')[0];
  const startTime = body.start_time || '09:00';
  const createdMatches = [];
  let matchIdx = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      // Same court = same time slot; next round of courts = +15 min
      const roundNum = courts.length > 0 ? Math.floor(matchIdx / courts.length) : matchIdx;
      const matchTime = addMinutes(`${scheduledTime}T${startTime}:00`, roundNum * 15);
      const court = courts.length > 0 ? courts[matchIdx % courts.length] : '';
      const t1 = await getTeamData(db, teams[i].id);
      const t2 = await getTeamData(db, teams[j].id);
      const result = await execute(db,
        `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, scheduled_time, court, status,
         team1_player1_name, team1_player2_name, team2_player1_name, team2_player2_name)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)`,
        body.stage_id, body.group_id, teams[i].id, teams[j].id, matchTime, court,
        t1?.player1_name || '', t1?.player2_name || '',
        t2?.player1_name || '', t2?.player2_name || ''
      );
      const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', result.meta.last_row_id);
      createdMatches.push(match);
      matchIdx++;
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
  if (body.team1_score !== undefined) { fields.push('team1_score = ?'); values.push(body.team1_score); }
  if (body.team2_score !== undefined) { fields.push('team2_score = ?'); values.push(body.team2_score); }
  if (body.winner_team_id !== undefined) { fields.push('winner_team_id = ?'); values.push(body.winner_team_id); }
  if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status); }
  if (body.walkover !== undefined) { fields.push('walkover = ?'); values.push(body.walkover); }

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
  const { serverPlayerId, side } = getServerAndSide(team1, 0, 1);

  // Freeze player names (in case not set at create time)
  const t2 = await getTeamData(db, match.team2_id);
  await execute(db,
    `UPDATE matches SET status = 'live', current_server_team = 1, current_server_player_id = ?, current_server_side = ?, current_server_number = 1, starting_team_done = 0,
     team1_player1_name = COALESCE(NULLIF(team1_player1_name,''), ?), team1_player2_name = COALESCE(NULLIF(team1_player2_name,''), ?),
     team2_player1_name = COALESCE(NULLIF(team2_player1_name,''), ?), team2_player2_name = COALESCE(NULLIF(team2_player2_name,''), ?)
     WHERE id = ?`,
    serverPlayerId, side, team1?.player1_name || '', team1?.player2_name || '',
    t2?.player1_name || '', t2?.player2_name || '', id
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
  let newServerNumber = match.current_server_number || 1;
  let newStartingTeamDone = match.starting_team_done || 0;

  if (scoringType === 'rally') {
    // Every rally awards a point to the winner
    if (rallyWinner === 1) newTeam1Score += 1;
    else newTeam2Score += 1;
    // Winner serves next
    newServingTeam = rallyWinner;
  } else {
    // Side-out scoring (traditional doubles: 2-server system)
    if (rallyWinner === servingTeam) {
      // Serving team won - they score
      if (servingTeam === 1) newTeam1Score += 1;
      else newTeam2Score += 1;
      newServingTeam = servingTeam;
      // Same server number continues
    } else {
      // Serving team lost the rally
      const isStartingPair = newStartingTeamDone === 0 && servingTeam === 1;
      const isOnServer1 = newServerNumber === 1;
      
      if (isOnServer1 && !isStartingPair) {
        // First server fault → switch to second server (same team continues)
        newServerNumber = 2;
        newServingTeam = servingTeam;
        sideOut = 0;
      } else {
        // Second server fault OR starting team's first server fault → side-out
        newServerNumber = 1;
        newServingTeam = rallyWinner;
        sideOut = 1;
        if (newStartingTeamDone === 0) newStartingTeamDone = 1;
      }
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
    const serverInfo = getServerAndSide(team1, newTeam1Score, newServerNumber);
    nextServerPlayerId = serverInfo.serverPlayerId;
    nextServerSide = serverInfo.side;
  } else {
    const serverInfo = getServerAndSide(team2, newTeam2Score, newServerNumber);
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

  // Update match with new scores, next server, and server number
  await execute(db,
    `UPDATE matches SET team1_score = ?, team2_score = ?, current_server_team = ?, current_server_player_id = ?, current_server_side = ?, current_server_number = ?, starting_team_done = ? WHERE id = ?`,
    newTeam1Score, newTeam2Score, newServingTeam, nextServerPlayerId, nextServerSide, newServerNumber, newStartingTeamDone, id
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
    const si = getServerAndSide(team1, state.team1Score, state.serverNumber);
    nextServerPlayerId = si.serverPlayerId;
    nextServerSide = si.side;
  } else if (team2) {
    const si = getServerAndSide(team2, state.team2Score, state.serverNumber);
    nextServerPlayerId = si.serverPlayerId;
    nextServerSide = si.side;
  } else {
    nextServerPlayerId = null;
    nextServerSide = 'right';
  }

  // Update match
  await execute(db,
    `UPDATE matches SET team1_score = ?, team2_score = ?, current_server_team = ?, current_server_player_id = ?, current_server_side = ?, current_server_number = ?, starting_team_done = ? WHERE id = ?`,
    state.team1Score, state.team2Score, state.currentServerTeam, nextServerPlayerId, nextServerSide, state.serverNumber || 1, state.startingTeamDone || 0, id
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

  // Get stage points_to_win for max score
  const stage = await queryOne(db, 'SELECT points_to_win FROM stages WHERE id = ?', match.stage_id);
  const maxPoints = stage?.points_to_win || 15;

  const winnerId = body.winner_team_id;
  const team1Won = winnerId === match.team1_id;
  const t1Score = team1Won ? maxPoints : 0;
  const t2Score = team1Won ? 0 : maxPoints;

  await execute(db,
    `UPDATE matches SET status = 'completed', winner_team_id = ?, walkover = 1,
     team1_score = ?, team2_score = ? WHERE id = ?`,
    winnerId, t1Score, t2Score, id
  );

  const updated = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  return c.json(updated);
});

// POST /api/admin/events/:slug/matches/:id/reset - reset match back to scheduled
matchRoutes.post('/:slug/matches/:id/reset', async (c) => {
  const { slug, id } = c.req.param();
  const db = c.env.DB;

  const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', id);
  if (!match) return c.json({ error: 'Match not found' }, 404);

  // Verify match belongs to event
  const stage = await queryOne(db, 'SELECT * FROM stages WHERE id = ? AND event_id = ?', match.stage_id, slug);
  if (!stage) return c.json({ error: 'Match not found' }, 404);

  // Delete all match points
  await execute(db, 'DELETE FROM match_points WHERE match_id = ?', id);

  // Reset match to scheduled state
  await execute(db,
    `UPDATE matches SET status = 'scheduled', team1_score = 0, team2_score = 0,
     winner_team_id = NULL, walkover = 0,
     current_server_team = NULL, current_server_player_id = NULL,
     current_server_side = NULL, current_server_number = NULL,
     starting_team_done = 0
     WHERE id = ?`,
    id
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

// POST /api/admin/events/:slug/matches/auto-advance — compute standings & fill knockout bracket
matchRoutes.post('/:slug/matches/auto-advance', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  // 1. Find round-robin stage (order_index = 1)
  const rrStage = await queryOne(db,
    "SELECT * FROM stages WHERE event_id = ? AND order_index = 1", slug
  );
  if (!rrStage) return c.json({ error: 'No round-robin stage found' }, 400);

  // 2. Find knockout stage (order_index = 2)
  const koStage = await queryOne(db,
    "SELECT * FROM stages WHERE event_id = ? AND order_index = 2", slug
  );
  if (!koStage) return c.json({ error: 'No knockout stage found' }, 400);

  // 3. Get all round-robin groups with their teams
  const rrGroups = await query(db,
    `SELECT g.* FROM groups_t g
     JOIN stage_groups sg ON sg.group_id = g.id
     WHERE sg.stage_id = ? AND g.stage_type = 'round_robin'
     ORDER BY g.name ASC`, rrStage.id
  );

  // 4. Get all completed matches for these groups
  const allCompleted = await query(db,
    `SELECT m.* FROM matches m
     JOIN stage_groups sg ON sg.group_id = m.group_id
     WHERE sg.stage_id = ? AND m.status = 'completed'`, rrStage.id
  );

  // 5. Check all RR matches are completed
  const totalRRMatches = await queryOne(db,
    `SELECT COUNT(*) as cnt FROM matches m
     JOIN stage_groups sg ON sg.group_id = m.group_id
     WHERE sg.stage_id = ?`, rrStage.id
  );
  if (allCompleted.length < (totalRRMatches?.cnt || 0)) {
    return c.json({
      error: 'Not all round-robin matches are completed yet',
      completed: allCompleted.length,
      total: totalRRMatches?.cnt || 0
    }, 400);
  }

  // 6. Compute standings per group: rank teams by wins, head-to-head tiebreaker
  const groupStandings = [];
  for (const grp of rrGroups) {
    // Get teams in this group
    const teams = await query(db,
      `SELECT t.*, p1.name AS p1_name, p1.nickname AS p1_nickname, p1.gender AS p1_gender,
              p2.name AS p2_name, p2.nickname AS p2_nickname, p2.gender AS p2_gender
       FROM group_teams gt
       JOIN teams t ON t.id = gt.team_id
       LEFT JOIN participants p1 ON t.player1_id = p1.id
       LEFT JOIN participants p2 ON t.player2_id = p2.id
       WHERE gt.group_id = ?`, grp.id
    );

    // Compute wins per team
    const wins = {};
    const h2h = {}; // "idA-idB" → which team won
    for (const t of teams) {
      wins[t.id] = 0;
      h2h[t.id] = {};
    }

    const groupMatches = allCompleted.filter(m => m.group_id === grp.id);
    for (const m of groupMatches) {
      if (m.team1_id && m.team2_id) {
        if (m.team1_score > m.team2_score) {
          wins[m.team1_id] = (wins[m.team1_id] || 0) + 1;
          if (h2h[m.team1_id]) h2h[m.team1_id][m.team2_id] = 'win';
          if (h2h[m.team2_id]) h2h[m.team2_id][m.team1_id] = 'loss';
        } else if (m.team2_score > m.team1_score) {
          wins[m.team2_id] = (wins[m.team2_id] || 0) + 1;
          if (h2h[m.team2_id]) h2h[m.team2_id][m.team1_id] = 'win';
          if (h2h[m.team1_id]) h2h[m.team1_id][m.team2_id] = 'loss';
        }
      }
    }

    // Sort teams: wins desc, then head-to-head
    const ranked = [...teams].sort((a, b) => {
      const wa = wins[a.id] || 0;
      const wb = wins[b.id] || 0;
      if (wa !== wb) return wb - wa;
      // Tiebreaker: head-to-head
      if (h2h[a.id] && h2h[a.id][b.id] === 'win') return -1;
      if (h2h[b.id] && h2h[b.id][a.id] === 'win') return 1;
      return 0;
    });

    groupStandings.push({ group: grp, teams: ranked, wins });
  }

  // 7. Get the first knockout round group (round_number = 1) and its placeholder matches
  const firstKoGroup = await queryOne(db,
    `SELECT g.* FROM groups_t g
     JOIN stage_groups sg ON sg.group_id = g.id
     WHERE sg.stage_id = ? AND g.stage_type = 'knockout' AND g.round_number = 1
     ORDER BY g.id ASC LIMIT 1`, koStage.id
  );
  if (!firstKoGroup) return c.json({ error: 'No first knockout round found' }, 400);

  const placeholderMatches = await query(db,
    `SELECT * FROM matches WHERE stage_id = ? AND group_id = ? AND team1_id IS NULL AND team2_id IS NULL
     ORDER BY id ASC`, koStage.id, firstKoGroup.id
  );

  // 8. Determine how many advance per group
  const totalAdvancing = placeholderMatches.length * 2;
  const advancePerGroup = Math.floor(totalAdvancing / rrGroups.length);
  if (advancePerGroup < 1) {
    return c.json({ error: `Not enough knockout slots (${totalAdvancing}) for ${rrGroups.length} groups` }, 400);
  }

  // 9. Build the advancing teams list in seeding order
  // Each group contributes top `advancePerGroup` teams in rank order
  // Groups are in alphabetical order: A, B, C, D...
  const advancing = [];
  for (let rank = 0; rank < advancePerGroup; rank++) {
    for (const gs of groupStandings) {
      if (gs.teams[rank]) {
        advancing.push({ ...gs.teams[rank], group_name: gs.group.name, rank: rank + 1 });
      }
    }
  }
  // advancing is now: [A1, B1, C1, D1, A2, B2, C2, D2] (winners then runners-up)

  // 10. Seed using standard bracket: 1vN, 2v(N-1), etc.
  // advancing[i] vs advancing[N-1-i] for i in [0, floor(N/2))
  const pairings = [];
  const n = advancing.length;
  for (let i = 0; i < n / 2; i++) {
    pairings.push({ team1: advancing[i], team2: advancing[n - 1 - i] });
  }
  // For 4 groups×1: [A1, B1, C1, D1] → A1vD1, B1vC1 ✓
  // For 2 groups×2: [A1, B1, A2, B2] → A1vB2, B1vA2 ✓

  // 11. Update placeholder matches
  const updated = [];
  for (let i = 0; i < pairings.length && i < placeholderMatches.length; i++) {
    const p = pairings[i];
    await execute(db,
      'UPDATE matches SET team1_id = ?, team2_id = ?, status = ? WHERE id = ?',
      p.team1.id, p.team2.id, 'scheduled', placeholderMatches[i].id
    );
    const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', placeholderMatches[i].id);
    updated.push(match);
  }

  return c.json({
    standings: groupStandings.map(gs => ({
      group_name: gs.group.name,
      teams: gs.teams.map((t, i) => ({
        id: t.id, name: t.name,
        p1_nickname: t.p1_nickname || t.p1_name,
        p2_nickname: t.p2_nickname || t.p2_name,
        wins: gs.wins[t.id] || 0,
        rank: i + 1,
        advancing: i < advancePerGroup
      }))
    })),
    pairings: pairings.map(p => ({
      team1: { id: p.team1.id, name: p.team1.name, group: p.team1.group_name, rank: p.team1.rank },
      team2: { id: p.team2.id, name: p.team2.name, group: p.team2.group_name, rank: p.team2.rank }
    })),
    updated_matches: updated
  });
});

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
