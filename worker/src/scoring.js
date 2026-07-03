/**
 * Pure scoring logic — no database dependencies, fully testable.
 */

// Helper: get server and side based on team score parity
// Player1 (starting right-side player) is always the designated server.
// They serve from the right when their team's score is even, left when odd.
// Side-out scoring has its own 2-server system via current_server_number.
export function getServerAndSide(team, score, serverNumber) {
  // serverNumber=2 → Server 2 (player2) serves; otherwise Server 1 (player1)
  const serverPlayerId = serverNumber === 2 ? team.player2_id : team.player1_id;
  const side = score % 2 === 0 ? 'right' : 'left';
  return { serverPlayerId, side };
}

// Helper: determine if match is complete
export function isMatchComplete(team1Score, team2Score, pointsToWin, deuceAllowed) {
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
export function recomputeMatchState(points, stageScoringType) {
  let team1Score = 0;
  let team2Score = 0;
  let currentServerTeam = 1; // team1 serves first
  let serverNumber = 1;
  let startingTeamDone = 0;

  for (const point of points) {
    const scoringType = point.scoring_type_at_time || stageScoringType;
    const rallyWinner = point.rally_winner_team; // 1 or 2
    const servingTeam = currentServerTeam;
    
    if (scoringType === 'rally') {
      // Every rally awards a point to the winner, who serves next
      if (rallyWinner === 1) team1Score += 1;
      else team2Score += 1;
      currentServerTeam = rallyWinner;
    } else {
      // Side-out scoring (traditional doubles: 2-server system)
      if (rallyWinner === servingTeam) {
        // Serving team won the rally — they score
        if (servingTeam === 1) team1Score += 1;
        else team2Score += 1;
        // Same team, same server number continues
        currentServerTeam = servingTeam;
      } else {
        // Serving team lost the rally
        const isStartingPair = startingTeamDone === 0 && servingTeam === 1;
        if (serverNumber === 1 && !isStartingPair) {
          // First server fault → switch to second server (same team)
          serverNumber = 2;
          currentServerTeam = servingTeam;
        } else {
          // Second server fault OR starting team's first fault → side-out
          serverNumber = 1;
          currentServerTeam = rallyWinner;
          if (startingTeamDone === 0) startingTeamDone = 1;
        }
      }
    }
  }

  return { team1Score, team2Score, currentServerTeam, serverNumber, startingTeamDone };
}
