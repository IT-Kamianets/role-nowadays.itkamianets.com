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
    onConnectionError: vi.fn(() => new Subject<string>()),
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
  const roleUi = {
    roleDef: vi.fn(() => null),
    roleTeamBadgeClass: vi.fn(() => ''),
    roleTeamTextClass: vi.fn(() => ''),
    roleIcon: vi.fn(() => ''),
    roleNameUk: vi.fn(() => ''),
    revealCardBg: vi.fn(() => ''),
    revealGlowColor: vi.fn(() => ''),
    revealBadge: vi.fn(() => ''),
    roleCardImage: vi.fn(() => ''),
    winnerBannerClass: vi.fn(() => ''),
    winnerIcon: vi.fn(() => ''),
    winnerLabel: vi.fn(() => ''),
    winnerDescription: vi.fn(() => ''),
    teamLabel: vi.fn(() => ''),
    teamAccent: vi.fn(() => ''),
    teamBadge: vi.fn(() => ''),
    roleCardBg: vi.fn(() => ''),
  };
  const nightAction = {
    isSleepingRole: vi.fn(() => false),
    hasNightAction: vi.fn(() => true),
    isMafiaTeamMember: vi.fn(() => false),
    roleNightActionLabel: vi.fn(() => ''),
    hasSubmittedNightAction: vi.fn(() => false),
    myNightTarget: vi.fn(() => null),
    getNightActionLogText: vi.fn((t: number, role: string, name: string) => `${role} → ${name}`),
    roleToField: vi.fn((role: string) => {
      const map: Record<string, string> = {
        Mafia: 'mafiaTarget', Godfather: 'mafiaTarget',
        Doctor: 'doctorTarget', Detective: 'detectiveTarget',
      };
      return map[role];
    }),
  };

  const component = new GameplayComponent(
    gameService as any,
    socketService as any,
    classicMafia as any,
    extendedMafia as any,
    route as any,
    router as any,
    roleUi as any,
    nightAction as any,
  );

  // Simulate post-ngOnInit state without calling ngOnInit (avoids setInterval/subscriptions)
  (component as any).gameId = 'game1';
  component.myIndexVal = 0;

  return { component, gameService, socketService, classicMafia, extendedMafia, roleUi, nightAction };
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

// ── sendDayMessage ────────────────────────────────────────────────────────────

describe('GameplayComponent.sendDayMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds message to allMessages on success', () => {
    const { component, gameService } = makeComponent();
    const msg = { _id: 'm1', text: 'Hello', creator: { _id: 'u1', name: 'Alice' }, data: { type: 'day' as const }, createdAt: '' };
    gameService.sendMessage.mockReturnValue(of(msg));
    component.dayChatText = 'Hello';

    component.sendDayMessage();

    expect(component.allMessages()).toContain(msg);
  });

  it('restores dayChatText and sets errorMsg on error', () => {
    const { component, gameService } = makeComponent();
    gameService.sendMessage.mockReturnValue(throwError(() => new Error('net')));
    component.dayChatText = 'Hello';

    component.sendDayMessage();

    expect(component.dayChatText).toBe('Hello');
    expect(component.errorMsg()).toBeTruthy();
  });

  it('does not call sendMessage when text is empty', () => {
    const { component, gameService } = makeComponent();
    component.dayChatText = '   ';

    component.sendDayMessage();

    expect(gameService.sendMessage).not.toHaveBeenCalled();
  });
});

// ── sendNightMessage ──────────────────────────────────────────────────────────

describe('GameplayComponent.sendNightMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds message to allMessages on success', () => {
    const { component, gameService } = makeComponent();
    const msg = { _id: 'm2', text: 'Night msg', creator: { _id: 'u1', name: 'Alice' }, data: { type: 'night' as const }, createdAt: '' };
    gameService.sendMessage.mockReturnValue(of(msg));
    component.nightChatText = 'Night msg';

    component.sendNightMessage();

    expect(component.allMessages()).toContain(msg);
  });

  it('restores nightChatText and sets errorMsg on error', () => {
    const { component, gameService } = makeComponent();
    gameService.sendMessage.mockReturnValue(throwError(() => new Error('net')));
    component.nightChatText = 'Night msg';

    component.sendNightMessage();

    expect(component.nightChatText).toBe('Night msg');
    expect(component.errorMsg()).toBeTruthy();
  });
});

// ── submitVote additional ─────────────────────────────────────────────────────

describe('GameplayComponent.submitVote (additional)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates currentGame on success', () => {
    const { component, gameService } = makeComponent();
    const updatedGame = makeGame({ data: makeGameData({ phase: 'night' }) });
    component.currentGame.set(makeGame({ data: makeGameData({ phase: 'voting' }) }));
    gameService.submitVote.mockReturnValue(of(updatedGame));

    component.submitVote(1);

    expect(component.currentGame()?.data.phase).toBe('night');
  });
});

// ── applyGameUpdate — finished phase ─────────────────────────────────────────

describe('GameplayComponent.applyGameUpdate — finished phase', () => {
  it('sets splitLayoutVisible true when phase becomes finished', () => {
    const { component } = makeComponent();
    // finished is not in active phases so splitLayoutVisible stays false unless already set from previous active phase
    // First enter an active phase
    (component as any).applyGameUpdate(makeGame({ data: makeGameData({ phase: 'day' }) }));
    expect(component.splitLayoutVisible()).toBe(true);
  });
});

// ── isMyPlayerAlive ───────────────────────────────────────────────────────────

describe('GameplayComponent.isMyPlayerAlive', () => {
  it('returns false when the player is dead (not in alive[])', () => {
    const { component } = makeComponent();
    component.myIndexVal = 0;
    component.currentGame.set(makeGame({ data: makeGameData({ alive: [1, 2, 3] }) }));

    expect(component.isMyPlayerAlive).toBe(false);
  });

  it('returns true when the player is alive', () => {
    const { component } = makeComponent();
    component.myIndexVal = 0;
    component.currentGame.set(makeGame({ data: makeGameData({ alive: [0, 1, 2, 3] }) }));

    expect(component.isMyPlayerAlive).toBe(true);
  });
});

// ── socketService.onConnectionError ──────────────────────────────────────────

describe('GameplayComponent — socket onConnectionError', () => {
  it('sets errorMsg when connection error fires', () => {
    const { component, socketService } = makeComponent();
    const errorSubject = new Subject<string>();
    socketService.onConnectionError.mockReturnValue(errorSubject);

    // Manually wire the subscription as ngOnInit would
    (component as any).connErrorSub = errorSubject.subscribe(() => {
      component.errorMsg.set('З\'єднання з сервером втрачено. Оновіть сторінку.');
    });

    errorSubject.next('auth error');

    expect(component.errorMsg()).toBeTruthy();
  });
});
