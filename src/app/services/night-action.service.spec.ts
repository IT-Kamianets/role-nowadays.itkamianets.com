import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NightActionService } from './night-action.service';
import type { MafiaGameData } from './classic-mafia.service';

// ── Minimal stubs ─────────────────────────────────────────────────────────────

function makeExtendedMafia() {
  return {
    ROLE_DEFS: {
      Mafia:        { team: 'mafia' },
      Godfather:    { team: 'mafia' },
      Consigliere:  { team: 'mafia' },
      Roleblocker:  { team: 'mafia' },
      Doctor:       { team: 'city' },
      Detective:    { team: 'city' },
      Bodyguard:    { team: 'city' },
      Sheriff:      { team: 'city' },
      Tracker:      { team: 'city' },
      Watcher:      { team: 'city' },
      Consigliere2: { team: 'city' },
      Poisoner:     { team: 'mafia' },
      Framer:       { team: 'mafia' },
      SerialKiller: { team: 'neutral' },
      Arsonist:     { team: 'neutral' },
      Priest:       { team: 'city' },
    },
  } as any;
}

function makeService() {
  return new NightActionService(makeExtendedMafia());
}

function makeNight(overrides: Partial<MafiaGameData['night']> = {}): MafiaGameData['night'] {
  return {
    mafiaTarget:    null,
    doctorTarget:   null,
    detectiveTarget: null,
    detectiveResult: null,
    ...overrides,
  };
}

// ── isSleepingRole ────────────────────────────────────────────────────────────

describe('NightActionService.isSleepingRole', () => {
  const svc = makeService();

  it('returns true for Villager', () => expect(svc.isSleepingRole('Villager')).toBe(true));
  it('returns true for Mayor',    () => expect(svc.isSleepingRole('Mayor')).toBe(true));
  it('returns true for Survivor', () => expect(svc.isSleepingRole('Survivor')).toBe(true));
  it('returns true for Jester',   () => expect(svc.isSleepingRole('Jester')).toBe(true));
  it('returns true for Executioner', () => expect(svc.isSleepingRole('Executioner')).toBe(true));

  it('returns false for Mafia',    () => expect(svc.isSleepingRole('Mafia')).toBe(false));
  it('returns false for Doctor',   () => expect(svc.isSleepingRole('Doctor')).toBe(false));
  it('returns false for null',     () => expect(svc.isSleepingRole(null)).toBe(false));
});

// ── hasNightAction ────────────────────────────────────────────────────────────

describe('NightActionService.hasNightAction', () => {
  const svc = makeService();

  it('returns true for all action roles', () => {
    const actors = ['Mafia', 'Godfather', 'Doctor', 'Detective', 'Bodyguard',
      'Sheriff', 'Tracker', 'Watcher', 'Consigliere', 'Roleblocker',
      'Poisoner', 'Framer', 'SerialKiller', 'Arsonist', 'Priest'];
    actors.forEach(r => expect(svc.hasNightAction(r), `${r} should have night action`).toBe(true));
  });

  it('returns false for Villager', () => expect(svc.hasNightAction('Villager')).toBe(false));
  it('returns false for null',     () => expect(svc.hasNightAction(null)).toBe(false));
});

// ── roleNightActionLabel ──────────────────────────────────────────────────────

describe('NightActionService.roleNightActionLabel', () => {
  const svc = makeService();

  it('returns Ukrainian label for Mafia', () => {
    expect(svc.roleNightActionLabel('Mafia')).toContain('жертву');
  });
  it('returns Ukrainian label for Doctor', () => {
    expect(svc.roleNightActionLabel('Doctor')).toContain('захистити');
  });
  it('returns empty string for unknown role', () => {
    expect(svc.roleNightActionLabel('Unknown')).toBe('');
  });
  it('returns empty string for null', () => {
    expect(svc.roleNightActionLabel(null)).toBe('');
  });
});

// ── hasSubmittedNightAction ───────────────────────────────────────────────────

describe('NightActionService.hasSubmittedNightAction', () => {
  const svc = makeService();

  it('Mafia: false when mafiaTarget is null', () => {
    expect(svc.hasSubmittedNightAction('Mafia', makeNight())).toBe(false);
  });
  it('Mafia: true when mafiaTarget is set', () => {
    expect(svc.hasSubmittedNightAction('Mafia', makeNight({ mafiaTarget: 2 }))).toBe(true);
  });

  it('Godfather: uses mafiaTarget field', () => {
    expect(svc.hasSubmittedNightAction('Godfather', makeNight({ mafiaTarget: 1 }))).toBe(true);
    expect(svc.hasSubmittedNightAction('Godfather', makeNight())).toBe(false);
  });

  it('Doctor: false when doctorTarget is null', () => {
    expect(svc.hasSubmittedNightAction('Doctor', makeNight())).toBe(false);
  });
  it('Doctor: true when doctorTarget is set', () => {
    expect(svc.hasSubmittedNightAction('Doctor', makeNight({ doctorTarget: 0 }))).toBe(true);
  });

  it('Detective: false when detectiveTarget is null', () => {
    expect(svc.hasSubmittedNightAction('Detective', makeNight())).toBe(false);
  });
  it('Detective: true when detectiveTarget is set (including 0)', () => {
    expect(svc.hasSubmittedNightAction('Detective', makeNight({ detectiveTarget: 0 }))).toBe(true);
  });

  it('Bodyguard: true when bodyguardTarget is set', () => {
    expect(svc.hasSubmittedNightAction('Bodyguard', makeNight({ bodyguardTarget: 1 }))).toBe(true);
  });

  it('Arsonist: true when arsonistTarget is set', () => {
    expect(svc.hasSubmittedNightAction('Arsonist', makeNight({ arsonistTarget: 2 }))).toBe(true);
  });
  it('Arsonist: true when arsonistIgnite is set', () => {
    expect(svc.hasSubmittedNightAction('Arsonist', makeNight({ arsonistIgnite: true }))).toBe(true);
  });
  it('Arsonist: false when neither is set', () => {
    expect(svc.hasSubmittedNightAction('Arsonist', makeNight())).toBe(false);
  });

  it('returns false for null role', () => {
    expect(svc.hasSubmittedNightAction(null, makeNight())).toBe(false);
  });

  it('returns false for null night', () => {
    expect(svc.hasSubmittedNightAction('Mafia', null as any)).toBe(false);
  });
});

// ── myNightTarget ─────────────────────────────────────────────────────────────

describe('NightActionService.myNightTarget', () => {
  const svc = makeService();

  it('returns mafiaTarget for Mafia role', () => {
    expect(svc.myNightTarget('Mafia', makeNight({ mafiaTarget: 3 }))).toBe(3);
  });
  it('returns mafiaTarget for Godfather role', () => {
    expect(svc.myNightTarget('Godfather', makeNight({ mafiaTarget: 2 }))).toBe(2);
  });
  it('returns doctorTarget for Doctor role', () => {
    expect(svc.myNightTarget('Doctor', makeNight({ doctorTarget: 1 }))).toBe(1);
  });
  it('returns detectiveTarget for Detective role', () => {
    expect(svc.myNightTarget('Detective', makeNight({ detectiveTarget: 0 }))).toBe(0);
  });
  it('returns null when no target set', () => {
    expect(svc.myNightTarget('Mafia', makeNight())).toBeNull();
  });
  it('returns null for null role', () => {
    expect(svc.myNightTarget(null, makeNight())).toBeNull();
  });
  it('returns null for null night', () => {
    expect(svc.myNightTarget('Doctor', null as any)).toBeNull();
  });
});

// ── getNightActionLogText ─────────────────────────────────────────────────────

describe('NightActionService.getNightActionLogText', () => {
  const svc = makeService();

  it('includes the player name in the log text', () => {
    const text = svc.getNightActionLogText(2, 'Mafia', 'Alice');
    expect(text).toContain('Alice');
  });
  it('returns different text for different roles', () => {
    const mafia = svc.getNightActionLogText(2, 'Mafia', 'Alice');
    const doctor = svc.getNightActionLogText(2, 'Doctor', 'Alice');
    expect(mafia).not.toBe(doctor);
  });
  it('falls back gracefully for unknown role', () => {
    const text = svc.getNightActionLogText(0, 'Unknown', 'Bob');
    expect(text).toContain('Bob');
  });
});

// ── roleToField ───────────────────────────────────────────────────────────────

describe('NightActionService.roleToField', () => {
  const svc = makeService();

  it('Mafia → mafiaTarget',        () => expect(svc.roleToField('Mafia')).toBe('mafiaTarget'));
  it('Godfather → mafiaTarget',    () => expect(svc.roleToField('Godfather')).toBe('mafiaTarget'));
  it('Doctor → doctorTarget',      () => expect(svc.roleToField('Doctor')).toBe('doctorTarget'));
  it('Detective → detectiveTarget',() => expect(svc.roleToField('Detective')).toBe('detectiveTarget'));
  it('Arsonist → arsonistTarget',  () => expect(svc.roleToField('Arsonist')).toBe('arsonistTarget'));
  it('returns undefined for Villager', () => expect(svc.roleToField('Villager')).toBeUndefined());
  it('returns undefined for unknown',  () => expect(svc.roleToField('Unknown')).toBeUndefined());
});
