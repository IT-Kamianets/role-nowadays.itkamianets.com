import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import type { MafiaGameData } from '../../services/classic-mafia.service';
import type { Game } from '../../models/game.model';

// Set up browser-like globals before any GameplayComponent instance is created.
// Class fields (e.g. `isOnline = signal(navigator.onLine)`) execute in the constructor,
// so these assignments must be in place before `new GameplayComponent(...)` is called.
if (typeof navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true },
    configurable: true,
    writable: true,
  });
} else {
  Object.defineProperty(globalThis.navigator, 'onLine', {
    value: true,
    configurable: true,
    writable: true,
  });
}
if (typeof window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    },
    configurable: true,
    writable: true,
  });
}

// eslint-disable-next-line import/first
import { GameplayComponent } from './gameplay';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeGameData(overrides: Partial<MafiaGameData> = {}): MafiaGameData {
  return {
    phase: 'night',
    round: 1,
    roles: { '0': 'Mafia', '1': 'Doctor', '2': 'Detective', '3': 'Villager' },
    alive: [0, 1, 2, 3],
    night: {
      mafiaTarget: null,
      doctorTarget: null,
      detectiveTarget: null,
      detectiveResult: null,
    },
    eliminated: null,
    winner: null,
    log: [],
    votes: {},
    phaseStartedAt: Date.now(),
    doctorSelfHealed: false,
    settings: { dayDuration: 60, nightDuration: 30, votingDuration: 30 },
    ...overrides,
  } as MafiaGameData;
}

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    _id: 'game1',
    mode: 'Classic',
    status: 'running',
    maxPlayers: 4,
    players: [
      { _id: 'u1', name: 'Alice' },
      { _id: 'u2', name: 'Bob' },
      { _id: 'u3', name: 'Carol' },
      { _id: 'u4', name: 'Dan' },
    ],
    creator: { _id: 'u1', name: 'Alice' },
    pass: 0,
    data: makeGameData(),
    ...overrides,
  } as Game;
}

function makeComponent() {
  const gameService = {
    getGame: vi.fn(() => of(makeGame())),
    getPlayerIndex: vi.fn(() => 0),
    isCreator: vi.fn((id: string) => true),
    getNickname: vi.fn(() => 'Alice'),
    submitNightAction: vi.fn(() => of(makeGame())),
    submitVote: vi.fn(() => of(makeGame())),
    updateGame: vi.fn(() => of(makeGame())),
    getMessages: vi.fn(() => of([])),
    sendMessage: vi.fn(() => of(null)),
    emitUpdate: vi.fn(),
  };
  const socketService = {
    connect: vi.fn(),
    joinRoom: vi.fn(),
    onGameUpdate: vi.fn(() => new Subject<Game>()),
    onReconnect: vi.fn(() => new Subject<void>()),
    emit: vi.fn(),
  };
  const classicMafia = {
    resolveNight: vi.fn((d: MafiaGameData) => ({ data: { ...d } })),
    checkWin: vi.fn(() => null as any),
    resolveVoting: vi.fn((d: MafiaGameData) => ({ ...d })),
    ROLE_DEFS: {} as any,
  };
  const extendedMafia = {
    resolveNight: vi.fn((d: MafiaGameData) => ({ data: { ...d } })),
    checkWin: vi.fn(() => null as any),
    resolveVoting: vi.fn((d: MafiaGameData) => ({ ...d })),
    ROLE_DEFS: { Mafia: { team: 'mafia' } } as any,
  };
  const route = { snapshot: { paramMap: { get: vi.fn(() => 'game1') } } };
  const router = { navigate: vi.fn() };
  const roleConstants = {};

  const component = new GameplayComponent(
    gameService as any,
    socketService as any,
    classicMafia as any,
    extendedMafia as any,
    route as any,
    router as any,
    roleConstants as any,
  );

  // Simulate post-ngOnInit state without calling ngOnInit (avoids setInterval/subscriptions)
  (component as any).gameId = 'game1';
  component.myIndexVal = 0;

  return { component, gameService, socketService, classicMafia, extendedMafia };
}

// ── applyGameUpdate ───────────────────────────────────────────────────────────

describe('GameplayComponent.applyGameUpdate', () => {
  it('sets currentGame signal to the new game', () => {
    const { component } = makeComponent();
    const game = makeGame();
    (component as any).applyGameUpdate(game);
    expect(component.currentGame()).toEqual(game);
  });

  it('resets hasVoted and myVoteTarget when phase transitions away from voting', () => {
    const { component } = makeComponent();
    // Start in voting phase
    const votingGame = makeGame({ data: makeGameData({ phase: 'voting' }) });
    (component as any).applyGameUpdate(votingGame);
    component.hasVoted.set(true);
    component.myVoteTarget.set(2);

    // Transition to night — should reset vote state
    const nightGame = makeGame({ data: makeGameData({ phase: 'night' }) });
    (component as any).applyGameUpdate(nightGame);

    expect(component.hasVoted()).toBe(false);
    expect(component.myVoteTarget()).toBeNull();
  });

  it('does NOT reset hasVoted when phase stays voting', () => {
    const { component } = makeComponent();
    const votingGame = makeGame({ data: makeGameData({ phase: 'voting' }) });
    (component as any).applyGameUpdate(votingGame);
    component.hasVoted.set(true);
    component.myVoteTarget.set(1);

    (component as any).applyGameUpdate({ ...votingGame });

    expect(component.hasVoted()).toBe(true);
    expect(component.myVoteTarget()).toBe(1);
  });

  it('appends only new log entries (not duplicates)', () => {
    const { component } = makeComponent();
    const game1 = makeGame({ data: makeGameData({ log: ['Entry A', 'Entry B'] }) });
    (component as any).applyGameUpdate(game1);
    const countAfterFirst = component.myLog().length;

    // Same 2 entries + 1 new
    const game2 = makeGame({ data: makeGameData({ log: ['Entry A', 'Entry B', 'Entry C'] }) });
    (component as any).applyGameUpdate(game2);

    expect(component.myLog().length).toBe(countAfterFirst + 1);
    expect(component.myLog().at(-1)?.text).toBe('Entry C');
    expect(component.myLog().at(-1)?.type).toBe('event');
  });

  it('sets splitLayoutVisible when entering an active phase', () => {
    const { component } = makeComponent();
    expect(component.splitLayoutVisible()).toBe(false);

    const dayGame = makeGame({ data: makeGameData({ phase: 'day' }) });
    (component as any).applyGameUpdate(dayGame);

    expect(component.splitLayoutVisible()).toBe(true);
  });
});

// ── submitNightAction ────────────────────────────────────────────────────────

describe('GameplayComponent.submitNightAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds optimistic log entry before request', () => {
    const { component, gameService } = makeComponent();
    component.currentGame.set(makeGame({ data: makeGameData({ phase: 'night', roles: { '0': 'Mafia', '1': 'Doctor', '2': 'Detective', '3': 'Villager' } }) }));
    gameService.submitNightAction.mockReturnValue(of(makeGame()));

    component.submitNightAction(2);

    expect(component.myLog().length).toBe(1);
    expect(component.myLog()[0].type).toBe('action');
  });

  it('updates currentGame on success', () => {
    const { component, gameService } = makeComponent();
    const updatedGame = makeGame({ _id: 'game1', data: makeGameData({ phase: 'day' }) });
    component.currentGame.set(makeGame({ data: makeGameData({ roles: { '0': 'Mafia', '1': 'Doctor', '2': 'Detective', '3': 'Villager' } }) }));
    gameService.submitNightAction.mockReturnValue(of(updatedGame));

    component.submitNightAction(1);

    expect(component.currentGame()?.data.phase).toBe('day');
  });

  it('removes optimistic log entry on error (rollback)', () => {
    const { component, gameService } = makeComponent();
    component.currentGame.set(makeGame({ data: makeGameData({ roles: { '0': 'Mafia', '1': 'Doctor', '2': 'Detective', '3': 'Villager' } }) }));
    gameService.submitNightAction.mockReturnValue(throwError(() => new Error('network')));

    component.submitNightAction(2);

    expect(component.myLog().length).toBe(0);
  });

  it('does nothing if player has no role', () => {
    const { component, gameService } = makeComponent();
    // No game set — myRole returns null
    component.submitNightAction(1);
    expect(gameService.submitNightAction).not.toHaveBeenCalled();
  });
});

// ── submitVote ───────────────────────────────────────────────────────────────

describe('GameplayComponent.submitVote', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets hasVoted and myVoteTarget optimistically', () => {
    const { component, gameService } = makeComponent();
    component.currentGame.set(makeGame({ data: makeGameData({ phase: 'voting' }) }));
    gameService.submitVote.mockReturnValue(of(makeGame()));

    component.submitVote(2);

    expect(component.hasVoted()).toBe(true);
    expect(component.myVoteTarget()).toBe(2);
  });

  it('appends a log entry with the target player name', () => {
    const { component, gameService } = makeComponent();
    component.currentGame.set(makeGame({ data: makeGameData({ phase: 'voting' }) }));
    gameService.submitVote.mockReturnValue(of(makeGame()));

    component.submitVote(1);

    const last = component.myLog().at(-1);
    expect(last?.type).toBe('action');
    expect(last?.text).toContain('Bob');
  });

  it('rolls back hasVoted, myVoteTarget and log entry on error', () => {
    const { component, gameService } = makeComponent();
    component.currentGame.set(makeGame({ data: makeGameData({ phase: 'voting' }) }));
    gameService.submitVote.mockReturnValue(throwError(() => new Error('fail')));

    component.submitVote(2);

    expect(component.hasVoted()).toBe(false);
    expect(component.myVoteTarget()).toBeNull();
    expect(component.myLog().length).toBe(0);
  });

  it('does nothing if myIndexVal is -1 (not in game)', () => {
    const { component, gameService } = makeComponent();
    component.myIndexVal = -1;
    component.submitVote(1);
    expect(gameService.submitVote).not.toHaveBeenCalled();
  });
});

// ── Transition flag reset ────────────────────────────────────────────────────

describe('GameplayComponent transition flags', () => {
  it('resets dayTransitionSent if not the creator', () => {
    const { component, gameService } = makeComponent();
    gameService.isCreator.mockReturnValue(false);
    component.currentGame.set(makeGame({ data: makeGameData({ phase: 'day' }) }));
    (component as any).dayTransitionSent = true;

    component.triggerDayToVoting();

    expect((component as any).dayTransitionSent).toBe(false);
    expect(gameService.updateGame).not.toHaveBeenCalled();
  });

  it('resets dayTransitionSent if game phase is not day', () => {
    const { component } = makeComponent();
    component.currentGame.set(makeGame({ data: makeGameData({ phase: 'night' }) }));
    (component as any).dayTransitionSent = true;

    component.triggerDayToVoting();

    expect((component as any).dayTransitionSent).toBe(false);
  });

  it('resets nightTransitionSent if not the creator', () => {
    const { component, gameService } = makeComponent();
    gameService.isCreator.mockReturnValue(false);
    component.currentGame.set(makeGame({ data: makeGameData({ phase: 'night' }) }));
    (component as any).nightTransitionSent = true;

    component.triggerNightToDay();

    expect((component as any).nightTransitionSent).toBe(false);
    expect(gameService.updateGame).not.toHaveBeenCalled();
  });

  it('resets dayTransitionSent on HTTP error', () => {
    const { component, gameService } = makeComponent();
    component.currentGame.set(makeGame({ data: makeGameData({ phase: 'day' }) }));
    gameService.updateGame.mockReturnValue(throwError(() => new Error('net')));
    (component as any).dayTransitionSent = true;

    component.triggerDayToVoting();

    expect((component as any).dayTransitionSent).toBe(false);
  });

  it('resets votingTransitionSent on HTTP error', () => {
    const { component, gameService } = makeComponent();
    component.currentGame.set(makeGame({ data: makeGameData({ phase: 'voting', votes: { '0': 1 } }) }));
    gameService.updateGame.mockReturnValue(throwError(() => new Error('net')));
    (component as any).votingTransitionSent = true;

    component.triggerVotingEnd();

    expect((component as any).votingTransitionSent).toBe(false);
  });
});
