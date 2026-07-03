/**
 * Unit tests for tournament format logic:
 *   - bracket size calculation
 *   - round name generation
 *   - format validation rules
 *   - match count per round
 */
import { describe, it, expect } from 'vitest';

// ─── Pure functions extracted from format.js / AdminFormat.jsx ──────────────

/** Compute the bracket size (next power of 2 >= advancing teams). */
function computeBracketSize(advancingTeams) {
  let size = 2;
  while (size < advancingTeams) size *= 2;
  return size;
}

/** Generate round names from largest to smallest (correct order). */
const ROUND_LABELS = ['Final', 'Semi-Finals', 'Quarter-Finals', 'Round of 16', 'Round of 32', 'Round of 64'];

function generateRoundNames(bracketSize) {
  const names = [];
  let temp = bracketSize;
  while (temp >= 2) {
    const label = ROUND_LABELS[Math.log2(temp) - 1] || `Round of ${temp}`;
    names.push(label);
    temp /= 2;
  }
  return names; // ["Quarter-Finals","Semi-Finals","Final"] for bracketSize=8
}

/** Count total knockout matches for a bracket. */
function countKnockoutMatches(bracketSize) {
  // total matches = bracketSize - 1
  return bracketSize - 1;
}

/** Count matches per knockout round. */
function matchesPerRound(bracketSize) {
  const rounds = [];
  let m = bracketSize / 2;
  while (m >= 1) {
    rounds.push(m);
    m /= 2;
  }
  return rounds; // [4,2,1] for bracketSize=8
}

/** Count round-robin matches: n teams → n*(n-1)/2 matches per group. */
function roundRobinMatchesPerGroup(teamsInGroup) {
  return (teamsInGroup * (teamsInGroup - 1)) / 2;
}

/** Validate format config: returns array of error messages (empty = valid). */
function validateFormat({ teamCount, groupCount, advancePerGroup, formatType }) {
  const errors = [];
  if (formatType === 'knockout_only') return errors;

  const teamsPerGroup = Math.ceil(teamCount / groupCount);

  if (teamsPerGroup < 2) {
    errors.push(`With ${teamCount} teams and ${groupCount} group${groupCount > 1 ? 's' : ''}, at least one group would have fewer than 2 teams.`);
  }
  if (advancePerGroup > teamsPerGroup) {
    errors.push(`Can't advance ${advancePerGroup} teams per group when groups only have ~${teamsPerGroup} teams each.`);
  }
  if (groupCount > teamCount) {
    errors.push(`Can't have more groups (${groupCount}) than teams (${teamCount}).`);
  }
  if (groupCount * advancePerGroup > teamCount) {
    errors.push(`${groupCount * advancePerGroup} teams advancing exceeds total ${teamCount} teams.`);
  }
  return errors;
}

// ─── Bracket size ──────────────────────────────────────────────────────────

describe('computeBracketSize', () => {
  it('2 advancing → bracket size 2', () => {
    expect(computeBracketSize(2)).toBe(2);
  });
  it('3 advancing → bracket size 4', () => {
    expect(computeBracketSize(3)).toBe(4);
  });
  it('4 advancing → bracket size 4', () => {
    expect(computeBracketSize(4)).toBe(4);
  });
  it('5 advancing → bracket size 8', () => {
    expect(computeBracketSize(5)).toBe(8);
  });
  it('8 advancing → bracket size 8', () => {
    expect(computeBracketSize(8)).toBe(8);
  });
  it('9 advancing → bracket size 16', () => {
    expect(computeBracketSize(9)).toBe(16);
  });
  it('16 advancing → bracket size 16', () => {
    expect(computeBracketSize(16)).toBe(16);
  });
});

// ─── Round names ───────────────────────────────────────────────────────────

describe('generateRoundNames', () => {
  it('bracketSize 2 → [Final]', () => {
    expect(generateRoundNames(2)).toEqual(['Final']);
  });
  it('bracketSize 4 → [Semi-Finals, Final]', () => {
    expect(generateRoundNames(4)).toEqual(['Semi-Finals', 'Final']);
  });
  it('bracketSize 8 → [Quarter-Finals, Semi-Finals, Final]', () => {
    expect(generateRoundNames(8)).toEqual(['Quarter-Finals', 'Semi-Finals', 'Final']);
  });
  it('bracketSize 16 → [Round of 16, Quarter-Finals, Semi-Finals, Final]', () => {
    expect(generateRoundNames(16)).toEqual(['Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Final']);
  });
  it('bracketSize 32 → [Round of 32, Round of 16, Quarter-Finals, Semi-Finals, Final]', () => {
    expect(generateRoundNames(32)).toEqual(['Round of 32', 'Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Final']);
  });
});

// ─── Match counts ──────────────────────────────────────────────────────────

describe('countKnockoutMatches', () => {
  it('bracket 2 → 1 match', () => expect(countKnockoutMatches(2)).toBe(1));
  it('bracket 4 → 3 matches', () => expect(countKnockoutMatches(4)).toBe(3));
  it('bracket 8 → 7 matches', () => expect(countKnockoutMatches(8)).toBe(7));
  it('bracket 16 → 15 matches', () => expect(countKnockoutMatches(16)).toBe(15));
});

describe('matchesPerRound', () => {
  it('bracket 2 → [1]', () => expect(matchesPerRound(2)).toEqual([1]));
  it('bracket 4 → [2, 1]', () => expect(matchesPerRound(4)).toEqual([2, 1]));
  it('bracket 8 → [4, 2, 1]', () => expect(matchesPerRound(8)).toEqual([4, 2, 1]));
  it('bracket 16 → [8, 4, 2, 1]', () => expect(matchesPerRound(16)).toEqual([8, 4, 2, 1]));
});

describe('roundRobinMatchesPerGroup', () => {
  it('2 teams → 1 match', () => expect(roundRobinMatchesPerGroup(2)).toBe(1));
  it('3 teams → 3 matches', () => expect(roundRobinMatchesPerGroup(3)).toBe(3));
  it('4 teams → 6 matches', () => expect(roundRobinMatchesPerGroup(4)).toBe(6));
  it('5 teams → 10 matches', () => expect(roundRobinMatchesPerGroup(5)).toBe(10));
  it('6 teams → 15 matches', () => expect(roundRobinMatchesPerGroup(6)).toBe(15));
});

// ─── End-to-end format match counts ────────────────────────────────────────

describe('full tournament match totals', () => {
  it('4 teams, 2 groups, 1 advance each → 2 RR + 1 KO = 3 matches', () => {
    // 2 groups of 2: each has 1 RR match = 2 total
    // 2 advance → bracket 2 → 1 KO match
    const rrMatches = 2 * roundRobinMatchesPerGroup(2); // 2
    const bracketSize = computeBracketSize(2 * 1); // 2
    const koMatches = countKnockoutMatches(bracketSize); // 1
    expect(rrMatches + koMatches).toBe(3);
  });

  it('8 teams, 2 groups, 2 advance each → 12 RR + 3 KO = 15 matches', () => {
    const rrMatches = 2 * roundRobinMatchesPerGroup(4); // 2*6=12
    const bracketSize = computeBracketSize(2 * 2); // 4
    const koMatches = countKnockoutMatches(bracketSize); // 3
    expect(rrMatches + koMatches).toBe(15);
  });

  it('12 teams, 4 groups, 2 advance each → 12 RR + 7 KO = 19 matches', () => {
    // 4 groups of 3 → 4 * 3 = 12 RR matches
    const rrMatches = 4 * roundRobinMatchesPerGroup(3); // 4*3=12
    const bracketSize = computeBracketSize(4 * 2); // 8
    const koMatches = countKnockoutMatches(bracketSize); // 7
    expect(rrMatches + koMatches).toBe(19);
  });
});

// ─── Format validation ─────────────────────────────────────────────────────

describe('validateFormat', () => {
  it('8 teams, 2 groups, 2 advance → valid', () => {
    expect(validateFormat({ teamCount: 8, groupCount: 2, advancePerGroup: 2, formatType: 'round_robin_knockout' }))
      .toEqual([]);
  });

  it('2 teams, 2 groups → invalid (groups < 2 teams)', () => {
    const errors = validateFormat({ teamCount: 2, groupCount: 2, advancePerGroup: 1, formatType: 'round_robin_knockout' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('fewer than 2 teams');
  });

  it('4 teams, 1 group, 5 advance → invalid (advancing too many)', () => {
    const errors = validateFormat({ teamCount: 4, groupCount: 1, advancePerGroup: 5, formatType: 'round_robin_knockout' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes("Can't advance"))).toBe(true);
  });

  it('4 teams, 5 groups → invalid (more groups than teams)', () => {
    const errors = validateFormat({ teamCount: 4, groupCount: 5, advancePerGroup: 1, formatType: 'round_robin_knockout' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('more groups'))).toBe(true);
  });

  it('4 teams, 1 group, 2 advance → exceeds total (4 > 4, but 2*1 ≤ 4, okay)', () => {
    // 2 advance from 1 group = 2 total ≤ 4, 2 ≤ 4 (teamsPerGroup)
    const errors = validateFormat({ teamCount: 4, groupCount: 1, advancePerGroup: 2, formatType: 'round_robin_knockout' });
    expect(errors).toEqual([]);
  });

  it('6 teams, 2 groups, 2 advance → valid', () => {
    expect(validateFormat({ teamCount: 6, groupCount: 2, advancePerGroup: 2, formatType: 'round_robin_knockout' }))
      .toEqual([]);
  });

  it('knockout_only always passes validation', () => {
    expect(validateFormat({ teamCount: 2, groupCount: 99, advancePerGroup: 99, formatType: 'knockout_only' }))
      .toEqual([]);
  });
});
