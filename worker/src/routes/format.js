/**
 * Tournament format setup — one endpoint to configure groups, stages, and matches
 */
import { Hono } from 'hono';
import { query, queryOne, execute } from '../db.js';

const formatRoutes = new Hono();

// GET /api/admin/events/:slug/royal-rumble-info - calculate permutation count
formatRoutes.get('/:slug/royal-rumble-info', async (c) => {
  const { slug } = c.req.param();
  const db = c.env.DB;

  const event = await queryOne(db, 'SELECT id, courts, start_time, end_time FROM events WHERE id = ?', slug);
  if (!event) return c.json({ error: 'Event not found' }, 404);

  const participants = await query(db, 'SELECT * FROM participants WHERE event_id = ?', slug);
  const n = participants.length;
  const totalPermutations = n >= 4 ? (n * (n - 1) * (n - 2) * (n - 3)) / 8 : 0;

  // Parse courts from event (stored as JSON array string like '["Court 1","Court 2"]')
  let courts = [];
  try {
    courts = JSON.parse(event.courts || '[]');
  } catch { courts = []; }
  const courtCount = courts.length || 1;

  // Calculate event duration in minutes for default match count
  let durationMinutes = 0;
  if (event.start_time && event.end_time) {
    const [sh, sm] = event.start_time.split(':').map(Number);
    const [eh, em] = event.end_time.split(':').map(Number);
    durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (durationMinutes < 0) durationMinutes = 0;
  }

  return c.json({
    player_count: n,
    total_permutations: totalPermutations,
    court_count: courtCount,
    courts,
    start_time: event.start_time || '',
    end_time: event.end_time || '',
    duration_minutes: durationMinutes
  });
});

// POST /api/admin/events/:slug/setup-format
formatRoutes.post('/:slug/setup-format', async (c) => {
  try {
  const { slug } = c.req.param();
  const db = c.env.DB;
  const body = await c.req.json();

  const event = await queryOne(db, 'SELECT id FROM events WHERE id = ?', slug);
  if (!event) return c.json({ error: 'Event not found' }, 404);

  const { format_type, round_robin, knockout } = body;
  if (!format_type) return c.json({ error: 'format_type is required' }, 400);

  // First, clear any existing groups/stages/matches for this event
  await execute(db, `DELETE FROM match_points WHERE match_id IN (SELECT id FROM matches WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?))`, slug);
  await execute(db, `DELETE FROM matches WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?)`, slug);
  await execute(db, `DELETE FROM stage_groups WHERE stage_id IN (SELECT id FROM stages WHERE event_id = ?)`, slug);
  await execute(db, `DELETE FROM stages WHERE event_id = ?`, slug);
  await execute(db, `DELETE FROM group_teams WHERE group_id IN (SELECT id FROM groups_t WHERE event_id = ?)`, slug);
  await execute(db, `DELETE FROM groups_t WHERE event_id = ?`, slug);
  // Clean up Royal Rumble ad-hoc teams (no emoji) so they don't pollute
  // round-robin/knockout formats. User-created teams always have emoji set.
  await execute(db, 'DELETE FROM teams WHERE event_id = ? AND emoji IS NULL', slug);

  const result = { groups: [], stages: [], matches: [] };

  // Store format_type on the event for public page rendering
  await execute(db, 'UPDATE events SET format_type = ? WHERE id = ?', format_type, slug);

  if (format_type === 'round_robin_knockout' || format_type === 'round_robin_only') {
    // --- Round Robin Phase ---
    const rrConfig = round_robin || {};
    const groupCount = rrConfig.group_count || 1;
    const advancePerGroup = rrConfig.advance_per_group || 1;
    const rrScoring = rrConfig.scoring || { scoring_type: 'rally', points_to_win: 15, deuce_allowed: true };

    // Get all teams
    const teams = await query(db, 'SELECT * FROM teams WHERE event_id = ?', slug);
    if (teams.length === 0) {
      return c.json({ error: 'No teams created yet. Create teams first.' }, 400);
    }

    // Validate: can't have more groups than teams
    if (groupCount > teams.length) {
      return c.json({ error: `Can't have more groups (${groupCount}) than teams (${teams.length}).` }, 400);
    }

    // Validate: each group must have at least 2 teams to play matches
    const minTeamsPerGroup = Math.floor(teams.length / groupCount);
    if (minTeamsPerGroup < 2) {
      return c.json({ error: `With ${teams.length} teams and ${groupCount} groups, at least one group would have fewer than 2 teams and can't play round-robin matches. Reduce the number of groups.` }, 400);
    }

    // Validate: advance per group can't exceed teams in a group
    if (advancePerGroup > Math.ceil(teams.length / groupCount)) {
      return c.json({ error: `Can't advance ${advancePerGroup} teams per group when groups only have ~${Math.ceil(teams.length / groupCount)} teams each.` }, 400);
    }

    // Create round-robin stage
    const stageResult = await execute(db,
      `INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index)
       VALUES (?, ?, ?, ?, ?, 1)`,
      slug, 'Round Robin', rrScoring.scoring_type || 'rally',
      rrScoring.points_to_win || 21, rrScoring.deuce_allowed !== false ? 1 : 0
    );
    const rrStageId = stageResult.meta.last_row_id;
    const rrStage = await queryOne(db, 'SELECT * FROM stages WHERE id = ?', rrStageId);
    result.stages.push(rrStage);

    // Distribute teams into groups
    const groupNames = rrConfig.group_names || 
      Array.from({ length: groupCount }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);

    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const groups_of_teams = Array.from({ length: groupCount }, () => []);
    shuffled.forEach((team, idx) => {
      groups_of_teams[idx % groupCount].push(team);
    });

    for (let g = 0; g < groupCount; g++) {
      // Create group
      const grpResult = await execute(db,
        'INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)',
        slug, groupNames[g] || `Group ${g + 1}`, 'round_robin', 1
      );
      const groupId = grpResult.meta.last_row_id;

      // Link to stage
      await execute(db, 'INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)', rrStageId, groupId);

      // Assign teams to group
      for (const team of groups_of_teams[g]) {
        await execute(db, 'INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)', groupId, team.id);
      }

      // Auto-generate round-robin matches
      const groupTeams = groups_of_teams[g];
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          const matchResult = await execute(db,
            `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status)
             VALUES (?, ?, ?, ?, 'scheduled')`,
            rrStageId, groupId, groupTeams[i].id, groupTeams[j].id
          );
          const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', matchResult.meta.last_row_id);
          result.matches.push(match);
        }
      }

      const grp = await queryOne(db, 'SELECT * FROM groups_t WHERE id = ?', groupId);
      result.groups.push({
        ...grp,
        teams: groups_of_teams[g],
        advance_count: advancePerGroup
      });
    }

    // --- Knockout Phase (if applicable) ---
    if (format_type === 'round_robin_knockout') {
      const koConfig = knockout || {};
      const koScoring = koConfig.scoring || { scoring_type: 'rally', points_to_win: 15, deuce_allowed: true };
      const advancingTeams = groupCount * advancePerGroup;

      // Determine bracket size (power of 2)
      let bracketSize = 2;
      while (bracketSize < advancingTeams) bracketSize *= 2;

      // Build round names from largest to smallest (Quarter-Finals → Semi-Finals → Final)
      const roundNames = [];
      let temp = bracketSize;
      const roundLabels = ['Final', 'Semi-Finals', 'Quarter-Finals', 'Round of 16', 'Round of 32', 'Round of 64'];
      while (temp >= 2) {
        const label = roundLabels[Math.log2(temp) - 1] || `Round of ${temp}`;
        roundNames.push(label);
        temp /= 2;
      }
      // roundNames is now: ["Quarter-Finals", "Semi-Finals", "Final"] for bracketSize=8
      // This is the correct order (round 1 = first, round N = final)

      // Create knockout stage
      const koStageResult = await execute(db,
        `INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index)
         VALUES (?, ?, ?, ?, ?, 2)`,
        slug, 'Knockout', koScoring.scoring_type || 'rally',
        koScoring.points_to_win || 21, koScoring.deuce_allowed !== false ? 1 : 0
      );
      const koStageId = koStageResult.meta.last_row_id;
      const koStage = await queryOne(db, 'SELECT * FROM stages WHERE id = ?', koStageId);
      result.stages.push(koStage);

      // Create groups and placeholder matches for each knockout round
      let matchesInRound = bracketSize / 2;
      for (let r = 0; r < roundNames.length; r++) {
        const grpResult = await execute(db,
          'INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)',
          slug, roundNames[r], 'knockout', r + 1
        );
        const groupId = grpResult.meta.last_row_id;
        await execute(db, 'INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)', koStageId, groupId);

        // Create placeholder matches for this round (TBD teams — admin fills in as teams advance)
        for (let m = 0; m < matchesInRound; m++) {
          const matchResult = await execute(db,
            `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status)
             VALUES (?, ?, NULL, NULL, 'scheduled')`,
            koStageId, groupId
          );
          const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', matchResult.meta.last_row_id);
          result.matches.push(match);
        }

        matchesInRound /= 2;

        const grp = await queryOne(db, 'SELECT * FROM groups_t WHERE id = ?', groupId);
        result.groups.push(grp);
      }
    }
  } else if (format_type === 'royal_rumble') {
    // --- Royal Rumble: every permutation of pairings, no fixed teams ---
    const rrConfig = round_robin || {};
    const rrScoring = rrConfig.scoring || { scoring_type: 'rally', points_to_win: 15, deuce_allowed: true };
    const matchCount = rrConfig.match_count || 0; // 0 = use total permutations
    const courtCount = rrConfig.court_count || 1;

    // Royal Rumble creates ad-hoc teams per unique pair — previous format's
    // emoji-less teams were already cleaned up above, so we start fresh.

    // Get all participants, deduplicated by name (keep first occurrence)
    const allParticipants = await query(db, 'SELECT * FROM participants WHERE event_id = ?', slug);
    const seen = new Set();
    const participants = allParticipants.filter(p => {
      const key = p.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const n = participants.length;
    if (n < 4) {
      return c.json({ error: 'Need at least 4 players for Royal Rumble. Add more players first.' }, 400);
    }

    // Calculate total possible unique 2v2 matchups: C(N,4) * 3 = N*(N-1)*(N-2)*(N-3)/8
    const totalPermutations = (n * (n - 1) * (n - 2) * (n - 3)) / 8;
    const targetMatches = matchCount > 0 ? Math.min(matchCount, totalPermutations) : totalPermutations;

    // Generate all possible pair combinations
    const allPairs = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        allPairs.push([participants[i], participants[j]]);
      }
    }

    // Generate all possible matches (unique 2v2 combinations)
    const allMatches = [];
    for (let pi = 0; pi < allPairs.length; pi++) {
      for (let pj = pi + 1; pj < allPairs.length; pj++) {
        const pair1 = allPairs[pi];
        const pair2 = allPairs[pj];
        // Ensure no player appears on both teams
        const ids1 = new Set([pair1[0].id, pair1[1].id]);
        const ids2 = new Set([pair2[0].id, pair2[1].id]);
        const overlap = [...ids1].some(id => ids2.has(id));
        if (!overlap) {
          allMatches.push({ pair1, pair2 });
        }
      }
    }

    // Greedy scheduling: minimize player downtime across rounds
    // Each round has up to courtCount concurrent matches
    const playerLastRound = {}; // player id -> last round they played
    participants.forEach(p => { playerLastRound[p.id] = -999; });

    // scheduledMatches is now an array of { match, round } objects so we
    // can preserve which scheduling round each match belongs to.
    const scheduledMatches = [];
    const usedMatchIdx = new Set();
    let currentRound = 0;

    while (scheduledMatches.length < targetMatches && usedMatchIdx.size < allMatches.length) {
      const roundMatches = [];

      // Find best matches for this round (up to courtCount concurrent matches,
      // no player can appear in more than one match per round)
      for (let court = 0; court < courtCount; court++) {
        let bestIdx = -1;
        let bestDowntime = -1; // we want the HIGHEST downtime (longest-waiting players)

        for (let mi = 0; mi < allMatches.length; mi++) {
          if (usedMatchIdx.has(mi)) continue;
          const m = allMatches[mi];
          const players = [m.pair1[0].id, m.pair1[1].id, m.pair2[0].id, m.pair2[1].id];

          // Check no player is already in this round
          const playersInRound = new Set(roundMatches.flatMap(rm =>
            [rm.pair1[0].id, rm.pair1[1].id, rm.pair2[0].id, rm.pair2[1].id]
          ));
          if (players.some(pid => playersInRound.has(pid))) continue;

          // Calculate total downtime (rounds since last played) for these players.
          // Higher = player has been sitting out longer → should be prioritized.
          const downtime = players.reduce((sum, pid) => sum + (currentRound - playerLastRound[pid]), 0);

          // Pick the match whose players have waited the LONGEST (highest downtime)
          if (downtime > bestDowntime) {
            bestDowntime = downtime;
            bestIdx = mi;
          }
        }

        if (bestIdx >= 0) {
          roundMatches.push(allMatches[bestIdx]);
          usedMatchIdx.add(bestIdx);
        }
      }

      if (roundMatches.length === 0) {
        // No more valid matches can be scheduled with remaining players.
        // Advance round counter (players sitting out get one more "round of rest"
        // counted against them, increasing their priority next round).
        currentRound++;
        continue;
      }

      // Update player last-round tracking
      for (const rm of roundMatches) {
        [rm.pair1[0].id, rm.pair1[1].id, rm.pair2[0].id, rm.pair2[1].id].forEach(pid => {
          playerLastRound[pid] = currentRound;
        });
      }

      // Store each match with its round number
      for (const rm of roundMatches) {
        scheduledMatches.push({ match: rm, round: currentRound });
      }
      currentRound++;
    }

    // Create teams (one per unique pair) and matches
    const pairTeamMap = new Map(); // key: "id1-id2" -> team object

    // Create round-robin stage
    const stageResult = await execute(db,
      `INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index)
       VALUES (?, ?, ?, ?, ?, 1)`,
      slug, 'Royal Rumble', rrScoring.scoring_type || 'rally',
      rrScoring.points_to_win || 21, rrScoring.deuce_allowed !== false ? 1 : 0
    );
    const rrStageId = stageResult.meta.last_row_id;
    const rrStage = await queryOne(db, 'SELECT * FROM stages WHERE id = ?', rrStageId);
    result.stages.push(rrStage);

    // Create a single group
    const grpResult = await execute(db,
      'INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)',
      slug, 'Royal Rumble', 'round_robin', 1
    );
    const groupId = grpResult.meta.last_row_id;
    await execute(db, 'INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)', rrStageId, groupId);

    // Helper to get or create a team for a pair of players
    const getOrCreateTeam = async (p1, p2) => {
      const key = [p1.id, p2.id].sort((a, b) => a - b).join('-');
      if (pairTeamMap.has(key)) return pairTeamMap.get(key);

      // Check if team already exists in DB (player order may differ from previous builds)
      const existing = await queryOne(db,
        'SELECT * FROM teams WHERE event_id = ? AND ((player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?))',
        slug, p1.id, p2.id, p2.id, p1.id
      );
      if (existing) {
        pairTeamMap.set(key, existing);
        // Ensure group assignment exists
        await execute(db,
          'INSERT OR IGNORE INTO group_teams (group_id, team_id) VALUES (?, ?)',
          groupId, existing.id
        );
        return existing;
      }

      const teamResult = await execute(db,
        'INSERT INTO teams (event_id, name, player1_id, player2_id) VALUES (?, ?, ?, ?)',
        slug, `Team ${pairTeamMap.size + 1}`, p1.id, p2.id
      );
      const team = await queryOne(db, 'SELECT * FROM teams WHERE id = ?', teamResult.meta.last_row_id);
      // Assign to group
      await execute(db, 'INSERT INTO group_teams (group_id, team_id) VALUES (?, ?)', groupId, team.id);
      pairTeamMap.set(key, team);
      return team;
    };

    // Create matches with scheduled times — each round = one time wave.
    // Matches within the same round run concurrently on different courts.
    // scheduledMatches is [{ match, round }, ...] ordered by round then court.
    let matchNum = 0;
    let currentScheduledRound = -1;
    let courtInRound = 0;

    for (const { match: sm, round } of scheduledMatches) {
      // Reset court counter when we enter a new round
      if (round !== currentScheduledRound) {
        currentScheduledRound = round;
        courtInRound = 0;
      }

      const team1 = await getOrCreateTeam(sm.pair1[0], sm.pair1[1]);
      const team2 = await getOrCreateTeam(sm.pair2[0], sm.pair2[1]);

      const courtNum = courtInRound + 1;
      const timeOffset = round * 15; // 15 min stagger per wave

      const matchResult = await execute(db,
        `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status, court, scheduled_time)
         VALUES (?, ?, ?, ?, 'scheduled', ?, ?)`,
        rrStageId, groupId, team1.id, team2.id,
        `Court ${courtNum}`,
        timeOffset > 0 ? `+${timeOffset}min` : ''
      );
      const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', matchResult.meta.last_row_id);
      result.matches.push(match);
      matchNum++;
      courtInRound++;
    }

    const grp = await queryOne(db, 'SELECT * FROM groups_t WHERE id = ?', groupId);
    result.groups.push({
      ...grp,
      teams: [...pairTeamMap.values()],
      advance_count: 0,
      total_permutations: totalPermutations,
      matches_generated: matchNum,
      courts_used: courtCount
    });

  } else if (format_type === 'knockout_only') {
    const koConfig = knockout || {};
    const koScoring = koConfig.scoring || { scoring_type: 'rally', points_to_win: 15, deuce_allowed: true };
    const teams = await query(db, 'SELECT * FROM teams WHERE event_id = ?', slug);

    if (teams.length < 2) {
      return c.json({ error: 'Need at least 2 teams' }, 400);
    }

    let bracketSize = 2;
    while (bracketSize < teams.length) bracketSize *= 2;

    const koStageResult = await execute(db,
      `INSERT INTO stages (event_id, name, scoring_type, points_to_win, deuce_allowed, order_index)
       VALUES (?, ?, ?, ?, ?, 1)`,
      slug, 'Knockout', koScoring.scoring_type || 'rally',
      koScoring.points_to_win || 21, koScoring.deuce_allowed !== false ? 1 : 0
    );
    const koStageId = koStageResult.meta.last_row_id;
    const koStage = await queryOne(db, 'SELECT * FROM stages WHERE id = ?', koStageId);
    result.stages.push(koStage);

    // Create a single group for all bracket matches
    const grpResult = await execute(db,
      'INSERT INTO groups_t (event_id, name, stage_type, round_number) VALUES (?, ?, ?, ?)',
      slug, 'Bracket', 'knockout', 1
    );
    const groupId = grpResult.meta.last_row_id;
    await execute(db, 'INSERT INTO stage_groups (stage_id, group_id) VALUES (?, ?)', koStageId, groupId);

    // Auto-generate bracket matches: random seeding, first round only
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    // Add byes for incomplete brackets: pad with null placeholders up to bracketSize
    const bracket = [...shuffled];
    while (bracket.length < bracketSize) bracket.push(null);

    // First round: pair adjacent teams
    const firstRoundMatches = [];
    for (let i = 0; i < bracket.length; i += 2) {
      if (bracket[i] && bracket[i + 1]) {
        const matchResult = await execute(db,
          `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status)
           VALUES (?, ?, ?, ?, 'scheduled')`,
          koStageId, groupId, bracket[i].id, bracket[i + 1].id
        );
        const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', matchResult.meta.last_row_id);
        firstRoundMatches.push(match);
        result.matches.push(match);
      } else if (bracket[i]) {
        // Bye — team gets a walkover to next round (create a placeholder match)
        const matchResult = await execute(db,
          `INSERT INTO matches (stage_id, group_id, team1_id, team2_id, status, walkover, winner_team_id)
           VALUES (?, ?, ?, ?, 'completed', 1, ?)`,
          koStageId, groupId, bracket[i].id, bracket[i].id, bracket[i].id
        );
        const match = await queryOne(db, 'SELECT * FROM matches WHERE id = ?', matchResult.meta.last_row_id);
        result.matches.push(match);
      }
    }

    const grp = await queryOne(db, 'SELECT * FROM groups_t WHERE id = ?', groupId);
    result.groups.push(grp);
  }

  return c.json({
    success: true,
    message: 'Tournament format set up successfully',
    ...result,
    summary: {
      groups_created: result.groups.length,
      stages_created: result.stages.length,
      matches_created: result.matches.length,
    }
  });
  } catch (err) {
    console.error('setup-format error:', err);
    return c.json({ error: err.message || 'Internal server error' }, 500);
  }
});

export default formatRoutes;
