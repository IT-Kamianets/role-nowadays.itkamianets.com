import { describe, it, expect } from 'vitest';
import { ClassicMafiaService, MafiaGameData } from './classic-mafia.service';

function makeService() {
  return new ClassicMafiaService();
}

function makeGameData(overrides: Partial<MafiaGameData> = {}): MafiaGameData {
  return {
    phase: 'night',
    round: 1,
    roles: { '0': 'Mafia', '1': 'Doctor', '2': 'Villager', '3': 'Villager' },
    alive: [0, 1, 2, 3],
    night: { mafiaTarget: null, doctorTarget: null, detectiveTarget: null, detectiveResult: null },
    eliminated: null,
    winner: null,
    log: [],
    votes: {},
    phaseStartedAt: 0,
    ...overrides,
  };
}

describe('ClassicMafiaService.assignRoles', () => {
  it('returns exactly 4 roles for 4 players', () => {
    const svc = makeService();
    const roles = svc.assignRoles(4);
    expect(roles).toHaveLength(4);
  });

  it('contains at least one Mafia for 4 players', () => {
    const svc = makeService();
    const roles = svc.assignRoles(4);
    expect(roles).toContain('Mafia');
  });

  it('contains at least one Village-side role for 4 players', () => {
    const svc = makeService();
    const roles = svc.assignRoles(4);
    const cityRoles = roles.filter(r => r !== 'Mafia');
    expect(cityRoles.length).toBeGreaterThan(0);
  });

  it('gives exactly 2 Mafia for 9 players', () => {
    const svc = makeService();
    const roles = svc.assignRoles(9);
    expect(roles.filter(r => r === 'Mafia')).toHaveLength(2);
  });

  it('gives exactly 7 non-Mafia roles for 9 players', () => {
    const svc = makeService();
    const roles = svc.assignRoles(9);
    expect(roles.filter(r => r !== 'Mafia')).toHaveLength(7);
  });
});

describe('ClassicMafiaService.resolveNight', () => {
  it('eliminated is null when doctor saves mafia target', () => {
    const svc = makeService();
    const data = makeGameData({
      night: { mafiaTarget: 2, doctorTarget: 2, detectiveTarget: null, detectiveResult: null },
    });
    const { data: result } = svc.resolveNight(data);
    expect(result.eliminated).toBeNull();
  });

  it('eliminated equals mafiaTarget when doctor does not save', () => {
    const svc = makeService();
    const data = makeGameData({
      night: { mafiaTarget: 2, doctorTarget: 1, detectiveTarget: null, detectiveResult: null },
    });
    const { data: result } = svc.resolveNight(data);
    expect(result.eliminated).toBe(2);
  });

  it('eliminated is null when mafiaTarget is null', () => {
    const svc = makeService();
    const data = makeGameData({
      night: { mafiaTarget: null, doctorTarget: null, detectiveTarget: null, detectiveResult: null },
    });
    const { data: result } = svc.resolveNight(data);
    expect(result.eliminated).toBeNull();
  });
});

describe('ClassicMafiaService.checkWin', () => {
  it('returns "village" when mafiaCount is 0', () => {
    const svc = makeService();
    const data = makeGameData({
      roles: { '0': 'Doctor', '1': 'Villager', '2': 'Villager' },
      alive: [0, 1, 2],
    });
    expect(svc.checkWin(data)).toBe('village');
  });

  it('returns "mafia" when mafia count >= village count', () => {
    const svc = makeService();
    const data = makeGameData({
      roles: { '0': 'Mafia', '1': 'Villager' },
      alive: [0, 1],
    });
    expect(svc.checkWin(data)).toBe('mafia');
  });

  it('returns null when game is still ongoing', () => {
    const svc = makeService();
    const data = makeGameData({
      roles: { '0': 'Mafia', '1': 'Villager', '2': 'Villager', '3': 'Doctor' },
      alive: [0, 1, 2, 3],
    });
    expect(svc.checkWin(data)).toBeNull();
  });
});

// ── resolveVoting ─────────────────────────────────────────────────────────────

describe('ClassicMafiaService.resolveVoting', () => {
  it('removes eliminated player from alive list', () => {
    const svc = makeService();
    const data = makeGameData({ alive: [0, 1, 2, 3] });
    const result = svc.resolveVoting(data, 2);
    expect(result.alive).not.toContain(2);
    expect(result.alive).toHaveLength(3);
  });

  it('sets eliminated to the given index', () => {
    const svc = makeService();
    const result = svc.resolveVoting(makeGameData(), 1);
    expect(result.eliminated).toBe(1);
  });

  it('increments round by 1', () => {
    const svc = makeService();
    const result = svc.resolveVoting(makeGameData({ round: 2 }), 0);
    expect(result.round).toBe(3);
  });

  it('switches phase to night', () => {
    const svc = makeService();
    const result = svc.resolveVoting(makeGameData({ phase: 'voting' }), 0);
    expect(result.phase).toBe('night');
  });

  it('resets night action targets', () => {
    const svc = makeService();
    const data = makeGameData({
      night: { mafiaTarget: 2, doctorTarget: 1, detectiveTarget: 3, detectiveResult: 'village' },
    });
    const result = svc.resolveVoting(data, 0);
    expect(result.night.mafiaTarget).toBeNull();
    expect(result.night.doctorTarget).toBeNull();
    expect(result.night.detectiveTarget).toBeNull();
    expect(result.night.detectiveResult).toBeNull();
  });

  it('adds a log entry about the voting elimination', () => {
    const svc = makeService();
    const before = makeGameData({ log: [], round: 1 });
    const result = svc.resolveVoting(before, 0);
    expect(result.log).toHaveLength(1);
    expect(result.log[0]).toContain('Гравець 1');
  });

  it('does not mutate the original data object', () => {
    const svc = makeService();
    const data = makeGameData({ alive: [0, 1, 2] });
    svc.resolveVoting(data, 1);
    expect(data.alive).toContain(1);
  });
});

// ── initGameData ──────────────────────────────────────────────────────────────

describe('ClassicMafiaService.initGameData', () => {
  it('returns phase "night" and round 1', () => {
    const svc = makeService();
    const d = svc.initGameData(4);
    expect(d.phase).toBe('night');
    expect(d.round).toBe(1);
  });

  it('alive array has playerCount entries [0..n-1]', () => {
    const svc = makeService();
    const d = svc.initGameData(6);
    expect(d.alive).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('log starts with one entry', () => {
    const svc = makeService();
    const d = svc.initGameData(4);
    expect(d.log).toHaveLength(1);
  });

  it('applies custom settings', () => {
    const svc = makeService();
    const settings = { dayDuration: 120, nightDuration: 60, votingDuration: 45 };
    const d = svc.initGameData(4, settings);
    expect(d.settings).toEqual(settings);
  });

  it('roles object has one key per player', () => {
    const svc = makeService();
    const d = svc.initGameData(5);
    expect(Object.keys(d.roles)).toHaveLength(5);
  });
});

// ── assignRoles edge cases ────────────────────────────────────────────────────

describe('ClassicMafiaService.assignRoles — edge cases', () => {
  it('2 players: only 1 Mafia, no crash', () => {
    const svc = makeService();
    const roles = svc.assignRoles(2);
    expect(roles).toHaveLength(2);
    expect(roles.filter(r => r === 'Mafia')).toHaveLength(1);
  });

  it('6 players: 1 Mafia', () => {
    const svc = makeService();
    const roles = svc.assignRoles(6);
    expect(roles.filter(r => r === 'Mafia')).toHaveLength(1);
  });

  it('7 players: 2 Mafia', () => {
    const svc = makeService();
    const roles = svc.assignRoles(7);
    expect(roles.filter(r => r === 'Mafia')).toHaveLength(2);
  });

  it('14 players: 3 Mafia, 2 Detectives', () => {
    const svc = makeService();
    const roles = svc.assignRoles(14);
    expect(roles.filter(r => r === 'Mafia')).toHaveLength(3);
    expect(roles.filter(r => r === 'Detective')).toHaveLength(2);
  });
});
