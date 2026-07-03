/**
 * Unit tests for pure scoring logic (getServerAndSide, isMatchComplete, recomputeMatchState)
 * These tests have NO database dependencies — pure functions only.
 */
import { describe, it, expect } from 'vitest';
import { getServerAndSide, isMatchComplete, recomputeMatchState } from '../../worker/src/scoring.js';

// ─── Test data ──────────────────────────────────────────────────────────────
const team = {
  player1_id: 101,
  player2_id: 102,
  player1_name: 'Alice',
  player2_name: 'Bob',
};

// ─── getServerAndSide ───────────────────────────────────────────────────────
describe('getServerAndSide', () => {

  it('Server 1 serves from right on even score', () => {
    const result = getServerAndSide(team, 0, 1);
    expect(result.serverPlayerId).toBe(101); // player1
    expect(result.side).toBe('right');
  });

  it('Server 1 serves from left on odd score', () => {
    const result = getServerAndSide(team, 1, 1);
    expect(result.serverPlayerId).toBe(101); // player1 always serves in rally
    expect(result.side).toBe('left');
  });

  it('Server 1 alternates sides as score increases (rally scoring)', () => {
    // RALLY SCORING: same player (player1) serves, just alternates sides
    const tests = [
      { score: 0, expectedSide: 'right' },
      { score: 1, expectedSide: 'left' },
      { score: 2, expectedSide: 'right' },
      { score: 3, expectedSide: 'left' },
      { score: 4, expectedSide: 'right' },
      { score: 5, expectedSide: 'left' },
    ];
    for (const { score, expectedSide } of tests) {
      const result = getServerAndSide(team, score, 1);
      expect(result.serverPlayerId).toBe(101);
      expect(result.side).toBe(expectedSide);
    }
  });

  it('Server 2 (player2) serves when serverNumber=2 (side-out)', () => {
    const result = getServerAndSide(team, 0, 2);
    expect(result.serverPlayerId).toBe(102); // player2
    expect(result.side).toBe('right'); // even score → right
  });

  it('Server 2 serves from left on odd score', () => {
    const result = getServerAndSide(team, 1, 2);
    expect(result.serverPlayerId).toBe(102);
    expect(result.side).toBe('left');
  });

  it('Server 2 alternates sides like Server 1', () => {
    const tests = [
      { score: 2, expectedSide: 'right' },
      { score: 3, expectedSide: 'left' },
    ];
    for (const { score, expectedSide } of tests) {
      const result = getServerAndSide(team, score, 2);
      expect(result.serverPlayerId).toBe(102);
      expect(result.side).toBe(expectedSide);
    }
  });
});

// ─── isMatchComplete ────────────────────────────────────────────────────────
describe('isMatchComplete', () => {

  it('Not complete when both scores below pointsToWin', () => {
    expect(isMatchComplete(5, 3, 11, true)).toBe(false);
  });

  it('Complete when reach pointsToWin with 2+ lead (deuce)', () => {
    expect(isMatchComplete(11, 9, 11, true)).toBe(true);
  });

  it('Not complete at 10-10 (deuce, need win by 2)', () => {
    expect(isMatchComplete(10, 10, 11, true)).toBe(false);
  });

  it('Complete at 12-10 (deuce, win by 2)', () => {
    expect(isMatchComplete(12, 10, 11, true)).toBe(true);
  });

  it('Complete at 15-13 (deuce higher target)', () => {
    expect(isMatchComplete(15, 13, 15, true)).toBe(true);
  });

  it('Not complete at 14-14 (deuce, 15 target)', () => {
    expect(isMatchComplete(14, 14, 15, true)).toBe(false);
  });

  it('Complete at 21-19 (deuce, 21 target)', () => {
    expect(isMatchComplete(21, 19, 21, true)).toBe(true);
  });

  it('Sudden death: first to 11 wins', () => {
    expect(isMatchComplete(11, 9, 11, false)).toBe(true);
  });

  it('Sudden death: 11-10 wins', () => {
    expect(isMatchComplete(11, 10, 11, false)).toBe(true);
  });

  it('Sudden death: not complete at 10-9', () => {
    expect(isMatchComplete(10, 9, 11, false)).toBe(false);
  });

  it('Sudden death at 21: first to 21 wins', () => {
    expect(isMatchComplete(21, 20, 21, false)).toBe(true);
  });
});

// ─── recomputeMatchState — RALLY SCORING ────────────────────────────────────
describe('recomputeMatchState — Rally Scoring', () => {

  it('Empty points: 0-0, team1 serves, server 1', () => {
    const state = recomputeMatchState([], 'rally');
    expect(state.team1Score).toBe(0);
    expect(state.team2Score).toBe(0);
    expect(state.currentServerTeam).toBe(1);
    expect(state.serverNumber).toBe(1);
    expect(state.startingTeamDone).toBe(0);
  });

  it('Team 1 serves and wins: 1-0, team1 keeps serving', () => {
    const points = [
      { rally_winner_team: 1, scoring_type_at_time: 'rally' },
    ];
    const state = recomputeMatchState(points, 'rally');
    expect(state.team1Score).toBe(1);
    expect(state.team2Score).toBe(0);
    expect(state.currentServerTeam).toBe(1); // winner serves next
    expect(state.serverNumber).toBe(1);
  });

  it('Team 1 serves and loses: 0-1, team2 serves', () => {
    const points = [
      { rally_winner_team: 2, scoring_type_at_time: 'rally' },
    ];
    const state = recomputeMatchState(points, 'rally');
    expect(state.team1Score).toBe(0);
    expect(state.team2Score).toBe(1);
    expect(state.currentServerTeam).toBe(2); // winner serves next
  });

  it('Team 1 wins 3 rallies in a row: always team1 serves', () => {
    const points = [
      { rally_winner_team: 1, scoring_type_at_time: 'rally' },
      { rally_winner_team: 1, scoring_type_at_time: 'rally' },
      { rally_winner_team: 1, scoring_type_at_time: 'rally' },
    ];
    const state = recomputeMatchState(points, 'rally');
    expect(state.team1Score).toBe(3);
    expect(state.team2Score).toBe(0);
    expect(state.currentServerTeam).toBe(1);
    expect(state.serverNumber).toBe(1);
  });

  it('Alternating wins: serve swaps each rally', () => {
    const points = [
      { rally_winner_team: 1, scoring_type_at_time: 'rally' }, // team1 serves, wins → 1-0, team1 serves
      { rally_winner_team: 2, scoring_type_at_time: 'rally' }, // team1 serves, loses → 1-1, team2 serves
      { rally_winner_team: 1, scoring_type_at_time: 'rally' }, // team2 serves, loses → 2-1, team1 serves
      { rally_winner_team: 2, scoring_type_at_time: 'rally' }, // team1 serves, loses → 2-2, team2 serves
    ];
    const state = recomputeMatchState(points, 'rally');
    expect(state.team1Score).toBe(2);
    expect(state.team2Score).toBe(2);
    expect(state.currentServerTeam).toBe(2); // last rally winner
    expect(state.serverNumber).toBe(1);
  });

  it('Rally scoring: every rally awards a point (no side-outs)', () => {
    const points = [
      { rally_winner_team: 1, scoring_type_at_time: 'rally' }, // team1 wins
      { rally_winner_team: 2, scoring_type_at_time: 'rally' }, // team2 wins
      { rally_winner_team: 1, scoring_type_at_time: 'rally' }, // team1 wins
      { rally_winner_team: 1, scoring_type_at_time: 'rally' }, // team1 wins
      { rally_winner_team: 2, scoring_type_at_time: 'rally' }, // team2 wins
    ];
    const state = recomputeMatchState(points, 'rally');
    expect(state.team1Score).toBe(3);
    expect(state.team2Score).toBe(2);
    expect(state.currentServerTeam).toBe(2); // last winner
  });
});

// ─── recomputeMatchState — SIDE-OUT SCORING ─────────────────────────────────
describe('recomputeMatchState — Side-Out Scoring', () => {

  it('Empty points: 0-0, team1, server 1, starting', () => {
    const state = recomputeMatchState([], 'side_out');
    expect(state.team1Score).toBe(0);
    expect(state.team2Score).toBe(0);
    expect(state.currentServerTeam).toBe(1);
    expect(state.serverNumber).toBe(1);
    expect(state.startingTeamDone).toBe(0);
  });

  it('Starting team: Server 1 wins → score, keeps serving', () => {
    // Team 1 (Server 1) serves and wins
    const points = [
      { rally_winner_team: 1, scoring_type_at_time: 'side_out' },
    ];
    const state = recomputeMatchState(points, 'side_out');
    expect(state.team1Score).toBe(1);
    expect(state.team2Score).toBe(0);
    expect(state.currentServerTeam).toBe(1); // same team
    expect(state.serverNumber).toBe(1); // same server
    expect(state.startingTeamDone).toBe(0); // still the starting team
  });

  it('Starting team: Server 1 faults (starting exception) → side-out immediately', () => {
    // Team 1 (Server 1) serves and loses — starting team only gets 1 server
    const points = [
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' },
    ];
    const state = recomputeMatchState(points, 'side_out');
    expect(state.team1Score).toBe(0);
    expect(state.team2Score).toBe(0); // no score
    expect(state.currentServerTeam).toBe(2); // side-out
    expect(state.serverNumber).toBe(1); // Team 2, Server 1
    expect(state.startingTeamDone).toBe(1); // starting exception used
  });

  it('After starting exception: Server 1 fault → switch to Server 2 (same team)', () => {
    // Team 2 is serving (not starting team), Server 1 faults
    const points = [
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 1 fault → side-out (starting exception)
      // Now Team 2 serving, Server 1
      { rally_winner_team: 1, scoring_type_at_time: 'side_out' }, // Team 2 Server 1 faults
    ];
    const state = recomputeMatchState(points, 'side_out');
    expect(state.team1Score).toBe(0);
    expect(state.team2Score).toBe(0);
    expect(state.currentServerTeam).toBe(2); // same team (Team 2) continues
    expect(state.serverNumber).toBe(2); // switched to Server 2
    expect(state.startingTeamDone).toBe(1);
  });

  it('Server 2 faults → side-out to other team', () => {
    const points = [
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // starting exception: Team 1 fault → Team 2
      { rally_winner_team: 1, scoring_type_at_time: 'side_out' }, // Team 2 Server 1 fault → Server 2
      { rally_winner_team: 1, scoring_type_at_time: 'side_out' }, // Team 2 Server 2 fault → side-out
    ];
    const state = recomputeMatchState(points, 'side_out');
    expect(state.team1Score).toBe(0);
    expect(state.team2Score).toBe(0);
    expect(state.currentServerTeam).toBe(1); // side-out back to Team 1
    expect(state.serverNumber).toBe(1); // Team 1 Server 1 (full 2-server turn now)
    expect(state.startingTeamDone).toBe(1);
  });

  it('Full sequence: Serve, score, fault, fault, side-out, score, fault, fault', () => {
    const points = [
      // Team 1 (starting) Server 1
      { rally_winner_team: 1, scoring_type_at_time: 'side_out' }, // Team 1 wins → 1-0, Server 1
      { rally_winner_team: 1, scoring_type_at_time: 'side_out' }, // Team 1 wins → 2-0, Server 1
      // Starting exception: but wait — Team 1 already scored, so they've served more than once
      // Let's do a proper sequence:
    ];
    // Reset: starting team faults first
    const points2 = [
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 1 fault → side-out (starting exception)
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 2 Server 1 wins → 0-1
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 2 Server 1 wins → 0-2
      { rally_winner_team: 1, scoring_type_at_time: 'side_out' }, // Team 2 Server 1 faults → Server 2
      { rally_winner_team: 1, scoring_type_at_time: 'side_out' }, // Team 2 Server 2 faults → side-out
      // Now Team 1 serves (full 2-server turn)
      { rally_winner_team: 1, scoring_type_at_time: 'side_out' }, // Team 1 Server 1 wins → 1-2
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 1 Server 1 faults → Server 2
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 1 Server 2 faults → side-out
    ];
    const state = recomputeMatchState(points2, 'side_out');
    expect(state.team1Score).toBe(1);
    expect(state.team2Score).toBe(2);
    expect(state.currentServerTeam).toBe(2); // side-out to Team 2
    expect(state.serverNumber).toBe(1); // Team 2 Server 1
    expect(state.startingTeamDone).toBe(1);
  });

  it('Serving team wins multiple points — keeps same server number', () => {
    const points = [
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // starting exception
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 2 Server 1 wins → 0-1
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 2 Server 1 wins → 0-2
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 2 Server 1 wins → 0-3
    ];
    const state = recomputeMatchState(points, 'side_out');
    expect(state.team1Score).toBe(0);
    expect(state.team2Score).toBe(3);
    expect(state.currentServerTeam).toBe(2);
    expect(state.serverNumber).toBe(1); // same server throughout
  });

  it('Mixed: score then fault then score — correct server tracking', () => {
    const points = [
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // starting exception
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 2 Server 1 wins → 0-1
      { rally_winner_team: 1, scoring_type_at_time: 'side_out' }, // Team 2 Server 1 faults → Server 2
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' }, // Team 2 Server 2 wins → 0-2
    ];
    const state = recomputeMatchState(points, 'side_out');
    expect(state.team1Score).toBe(0);
    expect(state.team2Score).toBe(2);
    expect(state.currentServerTeam).toBe(2);
    expect(state.serverNumber).toBe(2); // Server 2 still
  });
});

// ─── recomputeMatchState — EDGE CASES ───────────────────────────────────────
describe('recomputeMatchState — Edge Cases', () => {

  it('Deuce in rally scoring: multiple lead changes', () => {
    const points = [
      { rally_winner_team: 1, scoring_type_at_time: 'rally' }, // 1-0, team1 serves
      { rally_winner_team: 2, scoring_type_at_time: 'rally' }, // 1-1, team2 serves
      { rally_winner_team: 1, scoring_type_at_time: 'rally' }, // 2-1, team1 serves
      { rally_winner_team: 2, scoring_type_at_time: 'rally' }, // 2-2, team2 serves
      { rally_winner_team: 1, scoring_type_at_time: 'rally' }, // 3-2, team1 serves
      { rally_winner_team: 1, scoring_type_at_time: 'rally' }, // 4-2, team1 serves
    ];
    const state = recomputeMatchState(points, 'rally');
    expect(state.team1Score).toBe(4);
    expect(state.team2Score).toBe(2);
    expect(state.currentServerTeam).toBe(1); // team1 won the last rally
  });

  it('Mixed scoring types in point log (should not happen but handle gracefully)', () => {
    const points = [
      { rally_winner_team: 1, scoring_type_at_time: 'rally' },
      { rally_winner_team: 2, scoring_type_at_time: 'side_out' },
    ];
    // Should not crash — uses each point's own scoring_type_at_time
    const state = recomputeMatchState(points, 'rally');
    // Rally point: team1 wins → 1-0, team1 serves
    // Side-out point: team1 served, team2 won → side-out, no score (side-out logic)
    expect(state.team1Score).toBe(1);
    expect(state.team2Score).toBe(0);
  });

  it('Many points (long match) — performance sanity', () => {
    const points = [];
    for (let i = 0; i < 50; i++) {
      points.push({ rally_winner_team: (i % 2) + 1, scoring_type_at_time: 'rally' });
    }
    const state = recomputeMatchState(points, 'rally');
    expect(state.team1Score + state.team2Score).toBe(50);
    // Team 1 serves first, so they win on odd-numbered rallies
    expect(state.team1Score).toBe(25);
    expect(state.team2Score).toBe(25);
  });
});
