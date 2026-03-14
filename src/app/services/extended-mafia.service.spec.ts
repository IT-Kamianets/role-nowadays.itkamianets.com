import { describe, it, expect } from 'vitest';
import { ExtendedMafiaService } from './extended-mafia.service';
import { MafiaGameData } from './classic-mafia.service';

function makeService() {
  return new ExtendedMafiaService();
}

function makeGameData(
  roles: Record<string, string>,
  alive: number[],
  nightOverrides: Partial<MafiaGameData['night']> = {},
  extras: Partial<MafiaGameData> = {},
): MafiaGameData {
  return {
    phase: 'night',
    round: 1,
    roles,
    alive,
    night: {
      mafiaTarget: null,
      doctorTarget: null,
      detectiveTarget: null,
      detectiveResult: null,
      bodyguardTarget: null,
      sheriffTarget: null,
      sheriffResult: null,
      trackerTarget: null,
      trackerResult: null,
      watcherTarget: null,
      watcherResult: null,
      consigliereTarget: null,
      consigliereResult: null,
      roleblockerTarget: null,
      poisonerTarget: null,
      framerTarget: null,
      serialKillerTarget: null,
      arsonistTarget: null,
      arsonistIgnite: false,
      priestTarget: null,
      ...nightOverrides,
    },
    eliminated: null,
    winner: null,
    log: [],
    votes: {},
    phaseStartedAt: 0,
    poisoned: [],
    arsonistDoused: [],
    executionerTargets: {},
    dayMessages: [],
    nightMessages: [],
    settings: { dayDuration: 60, nightDuration: 30, votingDuration: 30 },
    ...extras,
  };
}

// ─── resolveNight ────────────────────────────────────────────────────────────

describe('ExtendedMafiaService.resolveNight — basic kills', () => {
  it('mafia kills target when doctor does not protect', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Doctor', '2': 'Villager', '3': 'Villager' },
      [0, 1, 2, 3],
      { mafiaTarget: 3, doctorTarget: 2 },
    );
    const { data: result } = svc.resolveNight(data);
    expect(result.alive).not.toContain(3);
    expect(result.eliminated).toBe(3);
  });

  it('mafia target survives when doctor protects the same player', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Doctor', '2': 'Villager', '3': 'Villager' },
      [0, 1, 2, 3],
      { mafiaTarget: 2, doctorTarget: 2 },
    );
    const { data: result } = svc.resolveNight(data);
    expect(result.alive).toContain(2);
    expect(result.eliminated).toBeNull();
  });

  it('nobody dies when mafiaTarget is null', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Villager', '2': 'Villager' },
      [0, 1, 2],
      { mafiaTarget: null },
    );
    const { data: result } = svc.resolveNight(data);
    expect(result.alive).toHaveLength(3);
    expect(result.eliminated).toBeNull();
  });
});

describe('ExtendedMafiaService.resolveNight — Bodyguard', () => {
  it('bodyguard dies instead of the protected mafia target', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Bodyguard', '2': 'Villager', '3': 'Villager' },
      [0, 1, 2, 3],
      { mafiaTarget: 2, bodyguardTarget: 2 },
    );
    const { data: result } = svc.resolveNight(data);
    expect(result.alive).toContain(2);   // protected target survives
    expect(result.alive).not.toContain(1); // bodyguard dies
  });
});

describe('ExtendedMafiaService.resolveNight — Detective', () => {
  it('detective identifies mafia member correctly', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Detective', '2': 'Villager' },
      [0, 1, 2],
      { mafiaTarget: 2, detectiveTarget: 0 },
    );
    const { data: result } = svc.resolveNight(data);
    expect(result.night.detectiveResult).toBe('mafia');
  });

  it('detective sees Godfather as village (innocent appearance)', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Godfather', '1': 'Detective', '2': 'Villager' },
      [0, 1, 2],
      { mafiaTarget: 2, detectiveTarget: 0 },
    );
    const { data: result } = svc.resolveNight(data);
    expect(result.night.detectiveResult).toBe('village');
  });

  it('Framer makes detective see innocent player as mafia', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Framer', '2': 'Detective', '3': 'Villager' },
      [0, 1, 2, 3],
      { mafiaTarget: null, framerTarget: 3, detectiveTarget: 3 },
    );
    const { data: result } = svc.resolveNight(data);
    expect(result.night.detectiveResult).toBe('mafia');
  });
});

describe('ExtendedMafiaService.resolveNight — Roleblocker & Priest', () => {
  it('roleblocker prevents doctor from saving the mafia target', () => {
    const svc = makeService();
    // Roleblocker blocks Doctor (index 1), so doctor's save is nullified
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Doctor', '2': 'Roleblocker', '3': 'Villager' },
      [0, 1, 2, 3],
      { mafiaTarget: 3, doctorTarget: 3, roleblockerTarget: 1 },
    );
    const { data: result } = svc.resolveNight(data);
    expect(result.alive).not.toContain(3); // Doctor was blocked, target dies
  });

  it('Priest protects player from being blocked by Roleblocker', () => {
    const svc = makeService();
    // Priest (index 4) protects Doctor (index 1); Roleblocker targets Doctor
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Doctor', '2': 'Roleblocker', '3': 'Villager', '4': 'Priest' },
      [0, 1, 2, 3, 4],
      { mafiaTarget: 3, doctorTarget: 3, roleblockerTarget: 1, priestTarget: 1 },
    );
    const { data: result } = svc.resolveNight(data);
    expect(result.alive).toContain(3); // Priest nullified block → Doctor saved target
  });
});

describe('ExtendedMafiaService.resolveNight — SerialKiller', () => {
  it('SerialKiller kills independently from mafia', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'SerialKiller', '2': 'Villager', '3': 'Villager' },
      [0, 1, 2, 3],
      { mafiaTarget: 2, serialKillerTarget: 3 },
    );
    const { data: result } = svc.resolveNight(data);
    expect(result.alive).not.toContain(2);
    expect(result.alive).not.toContain(3);
  });
});

// ─── checkWin ────────────────────────────────────────────────────────────────

describe('ExtendedMafiaService.checkWin', () => {
  it('returns "village" when all mafia and SK are eliminated', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Doctor', '1': 'Villager', '2': 'Villager' },
      [0, 1, 2],
    );
    expect(svc.checkWin(data)).toBe('village');
  });

  it('returns "mafia" when mafia outnumber the rest', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Mafia', '2': 'Villager' },
      [0, 1, 2],
    );
    expect(svc.checkWin(data)).toBe('mafia');
  });

  it('returns "serialkiller" when only SK remains', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'SerialKiller' },
      [0],
    );
    expect(svc.checkWin(data)).toBe('serialkiller');
  });

  it('returns null when game is still ongoing', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Villager', '2': 'Villager', '3': 'Doctor' },
      [0, 1, 2, 3],
    );
    expect(svc.checkWin(data)).toBeNull();
  });
});

// ─── resolveVoting ───────────────────────────────────────────────────────────

describe('ExtendedMafiaService.resolveVoting', () => {
  it('Jester wins when eliminated by voting', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Jester', '2': 'Villager' },
      [0, 1, 2],
    );
    const result = svc.resolveVoting(data, 1);
    expect(result.winner).toBe('jester');
    expect(result.phase).toBe('finished');
  });

  it('normal player elimination removes them from alive and advances to night', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Villager', '2': 'Villager' },
      [0, 1, 2],
    );
    const result = svc.resolveVoting(data, 2);
    expect(result.alive).not.toContain(2);
    expect(result.phase).toBe('night');
    expect(result.round).toBe(2);
  });

  it('Jester elimination sets winner=jester and phase=finished', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Villager', '2': 'Jester' },
      [0, 1, 2],
    );
    const result = svc.resolveVoting(data, 2);
    expect(result.winner).toBe('jester');
    expect(result.phase).toBe('finished');
  });

  it('Executioner wins when their target is eliminated by vote', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Executioner', '1': 'Villager', '2': 'Villager' },
      [0, 1, 2],
      {},
      { executionerTargets: { '0': 1 } },
    );
    const result = svc.resolveVoting(data, 1);
    expect(result.winner).toBe('executioner');
    expect(result.phase).toBe('finished');
  });

  it('Executioner does NOT win when a different player is eliminated', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Executioner', '1': 'Villager', '2': 'Mafia' },
      [0, 1, 2],
      {},
      { executionerTargets: { '0': 1 } },
    );
    const result = svc.resolveVoting(data, 2);
    expect(result.winner).toBeNull();
    expect(result.phase).toBe('night');
  });

  it('resolveVoting does not mutate original data', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Villager', '2': 'Villager' },
      [0, 1, 2],
    );
    svc.resolveVoting(data, 1);
    expect(data.alive).toContain(1);
    expect(data.round).toBe(1);
  });
});

// ── checkWin — extended scenarios ─────────────────────────────────────────────

describe('ExtendedMafiaService.checkWin — extended win conditions', () => {
  it('SerialKiller wins when only SK remains', () => {
    const svc = makeService();
    const data = makeGameData({ '0': 'SerialKiller' }, [0]);
    expect(svc.checkWin(data)).toBe('serialkiller');
  });

  it('village wins when all threats (mafia + SK) are gone, no Survivor', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Villager', '1': 'Doctor' },
      [0, 1],
    );
    expect(svc.checkWin(data)).toBe('village');
  });

  it('survivor wins when all threats gone and a Survivor is alive', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Villager', '1': 'Survivor' },
      [0, 1],
    );
    expect(svc.checkWin(data)).toBe('survivor');
  });

  it('mafia wins when mafia count >= everyone else combined', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Mafia', '2': 'Villager' },
      [0, 1, 2],
    );
    expect(svc.checkWin(data)).toBe('mafia');
  });

  it('returns null when game is still ongoing', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Villager', '2': 'Doctor', '3': 'Villager' },
      [0, 1, 2, 3],
    );
    expect(svc.checkWin(data)).toBeNull();
  });

  it('pre-set winner is preserved (does not override)', () => {
    const svc = makeService();
    const data = makeGameData(
      { '0': 'Mafia', '1': 'Villager' },
      [0, 1],
      {},
      { winner: 'jester' },
    );
    expect(svc.checkWin(data)).toBe('jester');
  });
});
