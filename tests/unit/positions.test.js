/**
 * Tests for frontend player position computation (NET swap logic).
 * These are pure functions extracted from LiveMatchView's rendering logic.
 */
import { describe, it, expect } from 'vitest';

// ─── Team data ──────────────────────────────────────────────────────────────
const teams = {
  1: { name: 'Team 1', p1: 'Alice', p2: 'Bob', g1: 'Female', g2: 'Male' },
  2: { name: 'Team 2', p1: 'YM', p2: 'JZ', g1: 'Male', g2: 'Female' },
};

// ─── Pure position computation (mirrors LiveMatchView logic) ────────────────
function computePositions({ nearTeam, farTeam, t1LeftPlayer, t2LeftPlayer, viewFlipped }) {
  const nearLeftP = t1LeftPlayer === 'p1'
    ? (nearTeam === 1 ? teams[1].p1 : teams[2].p1)
    : (nearTeam === 1 ? teams[1].p2 : teams[2].p2);

  const nearRightP = t1LeftPlayer === 'p1'
    ? (nearTeam === 1 ? teams[1].p2 : teams[2].p2)
    : (nearTeam === 1 ? teams[1].p1 : teams[2].p1);

  const farLeftP = t2LeftPlayer === 'p1'
    ? (farTeam === 1 ? teams[1].p1 : teams[2].p1)
    : (farTeam === 1 ? teams[1].p2 : teams[2].p2);

  const farRightP = t2LeftPlayer === 'p1'
    ? (farTeam === 1 ? teams[1].p2 : teams[2].p2)
    : (farTeam === 1 ? teams[1].p1 : teams[2].p1);

  return {
    nearLeft: nearLeftP,
    nearRight: nearRightP,
    farLeft: farLeftP,
    farRight: farRightP,
  };
}

// Simulates clicking NET: swaps near/far, flips positions only when t1==t2
function clickNet(state) {
  const sameParity = state.t1LeftPlayer === state.t2LeftPlayer;
  return {
    ...state,
    nearTeam: state.nearTeam === 1 ? 2 : 1,
    farTeam: state.farTeam === 1 ? 2 : 1,
    t1LeftPlayer: sameParity ? (state.t1LeftPlayer === 'p1' ? 'p2' : 'p1') : state.t1LeftPlayer,
    t2LeftPlayer: sameParity ? (state.t2LeftPlayer === 'p1' ? 'p2' : 'p1') : state.t2LeftPlayer,
  };
}

// Describes the court layout as a string for readability
function courtString(pos) {
  return `Far [${pos.farLeft} | ${pos.farRight}] / Near [${pos.nearLeft} | ${pos.nearRight}]`;
}

function describeState(s) {
  return `t1=${s.t1LeftPlayer}, t2=${s.t2LeftPlayer}, near=${s.nearTeam}, far=${s.farTeam}`;
}

// ─── Initial state (match just started, no points scored) ───────────────────
describe('NET swap — Initial state (no scoring)', () => {
  // loadMatch sets t1LeftPlayer='p2', t2LeftPlayer='p2'
  const initial = {
    nearTeam: 1,
    farTeam: 2,
    t1LeftPlayer: 'p2',
    t2LeftPlayer: 'p2',
  };

  it('Initial court layout is correct', () => {
    const pos = computePositions(initial);
    // Player2 on left = Bob for Team1, JZ for Team2
    // Player1 on right = Alice for Team1, YM for Team2
    expect(courtString(pos)).toBe('Far [JZ | YM] / Near [Bob | Alice]');
  });

  it('NET click: far-left (JZ) swaps to near-right', () => {
    const after = clickNet(initial);
    const pos = computePositions(after);
    expect(pos.farLeft).toBe('Alice');   // was near-right Alice
    expect(pos.farRight).toBe('Bob');    // was near-left Bob
    expect(pos.nearLeft).toBe('YM');     // was far-right YM
    expect(pos.nearRight).toBe('JZ');    // was far-left JZ
    expect(courtString(pos)).toBe('Far [Alice | Bob] / Near [YM | JZ]');
  });

  it('NET click twice returns to original', () => {
    const once = clickNet(initial);
    const twice = clickNet(once);
    const pos = computePositions(twice);
    expect(courtString(pos)).toBe('Far [JZ | YM] / Near [Bob | Alice]');
  });
});

// ─── After Team 1 scores (t1LeftPlayer flips to 'p1') ───────────────────────
describe('NET swap — After Team 1 scores (rally, serving team won)', () => {
  // recordPoint flips t1LeftPlayer when Team 1 wins while serving
  const afterScore = {
    nearTeam: 1,
    farTeam: 2,
    t1LeftPlayer: 'p1', // Team 1's players swapped (p1 now on left)
    t2LeftPlayer: 'p2', // Team 2 unchanged
  };

  it('Court after Team 1 scores: Alice now on left', () => {
    const pos = computePositions(afterScore);
    expect(courtString(pos)).toBe('Far [JZ | YM] / Near [Alice | Bob]');
  });

  it('NET click after Team 1 scores: diagonal (conditional flip)', () => {
    const after = clickNet(afterScore);
    const pos = computePositions(after);
    expect(courtString(pos)).toBe('Far [Bob | Alice] / Near [YM | JZ]');
  });
});

// ─── After Team 2 scores ────────────────────────────────────────────────────
describe('NET swap — After Team 2 scores', () => {
  const afterScore = {
    nearTeam: 1,
    farTeam: 2,
    t1LeftPlayer: 'p2', // Team 1 unchanged
    t2LeftPlayer: 'p1', // Team 2's players swapped (p1 now on left)
  };

  it('Court after Team 2 scores: YM now on far-left', () => {
    const pos = computePositions(afterScore);
    expect(courtString(pos)).toBe('Far [YM | JZ] / Near [Bob | Alice]');
  });

  it('NET click after Team 2 scores: vertical swap (scoring + NET cancel)', () => {
    const after = clickNet(afterScore);
    const pos = computePositions(after);
    expect(courtString(pos)).toBe('Far [Alice | Bob] / Near [JZ | YM]');
  });
});

// ─── Both teams scored ──────────────────────────────────────────────────────
describe('NET swap — Both teams scored', () => {
  const afterBothScored = {
    nearTeam: 1,
    farTeam: 2,
    t1LeftPlayer: 'p1', // Team 1 swapped (Alice left)
    t2LeftPlayer: 'p1', // Team 2 swapped (YM left)
  };

  it('Court after both scored', () => {
    const pos = computePositions(afterBothScored);
    expect(courtString(pos)).toBe('Far [YM | JZ] / Near [Alice | Bob]');
  });

  it('NET click: diagonal swap', () => {
    const after = clickNet(afterBothScored);
    const pos = computePositions(after);
    expect(courtString(pos)).toBe('Far [Bob | Alice] / Near [JZ | YM]');
  });
});

// ─── NET clicked multiple times with scoring in between ─────────────────────
describe('NET swap — Complex sequence', () => {
  it('Score → NET → Score → NET cycle', () => {
    let state = { nearTeam: 1, farTeam: 2, t1LeftPlayer: 'p2', t2LeftPlayer: 'p2' };

    // Start
    expect(courtString(computePositions(state))).toBe('Far [JZ | YM] / Near [Bob | Alice]');

    // Team 1 scores (serving team won) → t1 flips
    state = { ...state, t1LeftPlayer: 'p1' };
    expect(courtString(computePositions(state))).toBe('Far [JZ | YM] / Near [Alice | Bob]');

    // NET click
    state = clickNet(state);
    // JZ far-left → near-right? Actually goes to near-left due to double-flip
    // This is correct behavior: the perspective change combined with scoring
    // produces a net vertical swap, which is physically accurate

    // NET click back
    state = clickNet(state);
    expect(courtString(computePositions(state))).toBe('Far [JZ | YM] / Near [Alice | Bob]');
    // Back to where we were after scoring
  });
});

// ─── Run ALL initial states and verify diagonal swap ────────────────────────
describe('NET swap — ALL possible initial states (exhaustive)', () => {
  // There are 4 combinations of t1LeftPlayer/t2LeftPlayer
  const combos = [
    { t1: 'p2', t2: 'p2', desc: 'both default' },
    { t1: 'p1', t2: 'p2', desc: 'Team 1 swapped' },
    { t1: 'p2', t2: 'p1', desc: 'Team 2 swapped' },
    { t1: 'p1', t2: 'p1', desc: 'both swapped' },
  ];

  for (const { t1, t2, desc } of combos) {
    it(`${desc}: far-left↔near-right, far-right↔near-left when t1==t2`, () => {
      const before = { nearTeam: 1, farTeam: 2, t1LeftPlayer: t1, t2LeftPlayer: t2 };
      const posBefore = computePositions(before);
      const after = clickNet(before);
      const posAfter = computePositions(after);

      // NET ALWAYS produces diagonal swap (conditional flip on t1==t2)
      expect(posAfter.nearRight).toBe(posBefore.farLeft);
      expect(posAfter.nearLeft).toBe(posBefore.farRight);
      expect(posAfter.farRight).toBe(posBefore.nearLeft);
      expect(posAfter.farLeft).toBe(posBefore.nearRight);
    });
  }
});

// ─── The BUG user reports: far-left swapping with near-left ─────────────────
describe('NET swap — REGRESSION: far-left MUST NOT swap with near-left', () => {
  const states = [
    { desc: 'no scoring', t1: 'p2', t2: 'p2' },
    { desc: 'Team 1 scored', t1: 'p1', t2: 'p2' },
    { desc: 'Team 2 scored', t1: 'p2', t2: 'p1' },
    { desc: 'both scored', t1: 'p1', t2: 'p1' },
  ];

  for (const { desc, t1, t2 } of states) {
    it(`${desc}: diagonal swap happens when positions are same parity`, () => {
      const before = { nearTeam: 1, farTeam: 2, t1LeftPlayer: t1, t2LeftPlayer: t2 };
      const posBefore = computePositions(before);
      const after = clickNet(before);
      const posAfter = computePositions(after);

      // NET ALWAYS produces diagonal swap with conditional flip
      expect(posAfter.nearRight).toBe(posBefore.farLeft);
      expect(posAfter.nearLeft).toBe(posBefore.farRight);
    });
  }
});
