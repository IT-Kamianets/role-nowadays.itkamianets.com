import { describe, it, expect } from 'vitest';
import { TrueFaceService, TrueFaceGameData } from './true-face.service';

function makeService() {
  return new TrueFaceService();
}

function makeGameData(overrides: Partial<TrueFaceGameData> = {}): TrueFaceGameData {
  return {
    phase: 'guessing',
    round: 1,
    roundLimit: 3,
    players: {
      '0': { role: 'Mafia', score: 0 },
      '1': { role: 'Doctor', score: 0 },
      '2': { role: 'Villager', score: 0 },
    },
    currentGuesses: {},
    roundHistory: [],
    winners: [],
    roundStartedAt: 0,
    settings: { roles: ['Mafia', 'Doctor', 'Villager'], roundDuration: null },
    ...overrides,
  };
}

// ── assignRoles ───────────────────────────────────────────────────────────────

describe('TrueFaceService.assignRoles', () => {
  const svc = makeService();

  it('returns exactly playerCount roles', () => {
    const roles = svc.assignRoles(4, ['Mafia', 'Doctor', 'Villager']);
    expect(roles).toHaveLength(4);
  });

  it('each assigned role is in the provided list', () => {
    const pool = ['Mafia', 'Doctor', 'Villager'];
    const roles = svc.assignRoles(5, pool);
    roles.forEach(r => expect(pool).toContain(r));
  });

  it('works with a single role in the pool', () => {
    const roles = svc.assignRoles(3, ['Mafia']);
    expect(roles).toEqual(['Mafia', 'Mafia', 'Mafia']);
  });
});

// ── initGameData ──────────────────────────────────────────────────────────────

describe('TrueFaceService.initGameData', () => {
  const svc = makeService();

  it('phase starts as "guessing"', () => {
    const d = svc.initGameData(3, { roles: ['Mafia', 'Doctor', 'Villager'], roundLimit: 3, roundDuration: null });
    expect(d.phase).toBe('guessing');
  });

  it('round starts at 1', () => {
    const d = svc.initGameData(3, { roles: ['Mafia', 'Doctor', 'Villager'], roundLimit: 3, roundDuration: null });
    expect(d.round).toBe(1);
  });

  it('creates one player entry per participant', () => {
    const d = svc.initGameData(4, { roles: ['Mafia', 'Villager'], roundLimit: 2, roundDuration: 60 });
    expect(Object.keys(d.players)).toHaveLength(4);
  });

  it('all players start with score 0', () => {
    const d = svc.initGameData(3, { roles: ['Mafia', 'Doctor', 'Villager'], roundLimit: 3, roundDuration: null });
    Object.values(d.players).forEach(p => expect(p.score).toBe(0));
  });

  it('currentGuesses starts empty', () => {
    const d = svc.initGameData(3, { roles: ['Mafia', 'Doctor', 'Villager'], roundLimit: 3, roundDuration: null });
    expect(Object.keys(d.currentGuesses)).toHaveLength(0);
  });
});

// ── resolveRound ──────────────────────────────────────────────────────────────

describe('TrueFaceService.resolveRound — correct guesses scoring', () => {
  const svc = makeService();

  it('player who guesses all roles correctly gets full score', () => {
    const data = makeGameData({
      currentGuesses: {
        '0': { '1': 'Doctor', '2': 'Villager' }, // all correct
      },
    });
    const result = svc.resolveRound(data);
    expect(result.players['0'].score).toBe(2);
  });

  it('player with no guesses gets 0 points', () => {
    const data = makeGameData({ currentGuesses: {} });
    const result = svc.resolveRound(data);
    expect(result.players['0'].score).toBe(0);
  });

  it('partially correct guess gives partial score', () => {
    const data = makeGameData({
      currentGuesses: {
        '0': { '1': 'Doctor', '2': 'Mafia' }, // only '1' correct
      },
    });
    const result = svc.resolveRound(data);
    expect(result.players['0'].score).toBe(1);
  });

  it('does not mutate input data', () => {
    const data = makeGameData({
      currentGuesses: { '0': { '1': 'Doctor', '2': 'Villager' } },
    });
    svc.resolveRound(data);
    expect(data.players['0'].score).toBe(0);
  });

  it('clears currentGuesses after resolution', () => {
    const data = makeGameData({
      currentGuesses: { '0': { '1': 'Doctor', '2': 'Villager' } },
    });
    const result = svc.resolveRound(data);
    expect(Object.keys(result.currentGuesses)).toHaveLength(0);
  });
});

describe('TrueFaceService.resolveRound — phase transitions', () => {
  const svc = makeService();

  it('sets phase to "finished" when someone guesses all correctly', () => {
    const data = makeGameData({
      currentGuesses: { '0': { '1': 'Doctor', '2': 'Villager' } },
    });
    const result = svc.resolveRound(data);
    expect(result.phase).toBe('finished');
    expect(result.winners).toContain(0);
  });

  it('sets phase to "results" when round limit not reached and no winner', () => {
    const data = makeGameData({ round: 1, roundLimit: 3, currentGuesses: {} });
    const result = svc.resolveRound(data);
    expect(result.phase).toBe('results');
  });

  it('increments round on non-final round', () => {
    const data = makeGameData({ round: 1, roundLimit: 3, currentGuesses: {} });
    const result = svc.resolveRound(data);
    expect(result.round).toBe(2);
  });

  it('sets phase to "finished" when round limit is reached with no winner', () => {
    const data = makeGameData({ round: 3, roundLimit: 3, currentGuesses: {} });
    const result = svc.resolveRound(data);
    expect(result.phase).toBe('finished');
    expect(result.winners).toHaveLength(0);
  });

  it('appends an entry to roundHistory', () => {
    const data = makeGameData({ currentGuesses: {} });
    const result = svc.resolveRound(data);
    expect(result.roundHistory).toHaveLength(1);
    expect(result.roundHistory[0].round).toBe(1);
  });
});

// ── checkWin ──────────────────────────────────────────────────────────────────

describe('TrueFaceService.checkWin', () => {
  const svc = makeService();

  it('returns winners array from data.winners', () => {
    const data = makeGameData({ winners: [0, 2] });
    expect(svc.checkWin(data)).toEqual([0, 2]);
  });

  it('returns empty array when no winners', () => {
    const data = makeGameData({ winners: [] });
    expect(svc.checkWin(data)).toEqual([]);
  });
});
