import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { MockGameService } from './mock-game.service';

// ── In-memory localStorage stub ───────────────────────────────────────────────

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal('localStorage', localStorageMock);
});

function makeService() {
  return new MockGameService();
}

// ── isAuthenticated / initToken ───────────────────────────────────────────────

describe('MockGameService.isAuthenticated', () => {
  it('returns true (always authenticated in mock)', () => {
    const svc = makeService();
    expect(svc.isAuthenticated()).toBe(true);
  });
});

describe('MockGameService.initToken', () => {
  it('completes and sets nickname', async () => {
    const svc = makeService();
    await firstValueFrom(svc.initToken('TestUser'));
    expect(svc.getNickname()).toBe('TestUser');
  });
});

// ── getGames / getGame ────────────────────────────────────────────────────────

describe('MockGameService.getGames', () => {
  it('returns an array with one game', async () => {
    const svc = makeService();
    const games = await firstValueFrom(svc.getGames());
    expect(games).toHaveLength(1);
    expect(games[0]._id).toBe('mock-game-1');
  });
});

describe('MockGameService.getGame', () => {
  it('returns the mock game regardless of id', async () => {
    const svc = makeService();
    const game = await firstValueFrom(svc.getGame('any-id'));
    expect(game._id).toBe('mock-game-1');
  });
});

// ── createGame ────────────────────────────────────────────────────────────────

describe('MockGameService.createGame', () => {
  it('returns a game with the given mode', async () => {
    const svc = makeService();
    const game = await firstValueFrom(svc.createGame('Knight', 6));
    expect(game.mode).toBe('Knight');
  });

  it('sets maxPlayers on the game', async () => {
    const svc = makeService();
    const game = await firstValueFrom(svc.createGame('Classic', 10));
    expect(game.maxPlayers).toBe(10);
  });

  it('sets isCreator in localStorage', async () => {
    const svc = makeService();
    const game = await firstValueFrom(svc.createGame('Classic', 8));
    expect(svc.isCreator(game._id)).toBe(true);
  });
});

// ── joinGame ──────────────────────────────────────────────────────────────────

describe('MockGameService.joinGame', () => {
  it('adds a new player to the game', async () => {
    const svc = makeService();
    const before = await firstValueFrom(svc.getGame('mock-game-1'));
    const before_count = before.players.length;
    svc.setNickname('NewPlayer');
    const result = await firstValueFrom(svc.joinGame('mock-game-1'));
    expect(result).not.toBe(false);
    if (result !== false) {
      expect(result.players.length).toBe(before_count + 1);
    }
  });
});

// ── updateGame ────────────────────────────────────────────────────────────────

describe('MockGameService.updateGame', () => {
  it('patches the game status', async () => {
    const svc = makeService();
    const game = await firstValueFrom(svc.updateGame('mock-game-1', { status: 'running' }));
    expect(game.status).toBe('running');
  });
});

// ── submitVote ────────────────────────────────────────────────────────────────

describe('MockGameService.submitVote', () => {
  it('records the vote in data', async () => {
    const svc = makeService();
    await firstValueFrom(svc.submitVote('mock-game-1', 0, 2));
    const game = await firstValueFrom(svc.getGame('mock-game-1'));
    expect((game.data as any)['votes']?.['0']).toBe(2);
  });
});

// ── submitNightAction ─────────────────────────────────────────────────────────

describe('MockGameService.submitNightAction', () => {
  it('stores the night action field in data', async () => {
    const svc = makeService();
    await firstValueFrom(svc.submitNightAction('mock-game-1', 'mafiaTarget', 1));
    const game = await firstValueFrom(svc.getGame('mock-game-1'));
    expect((game.data as any)['nightActions']?.['mafiaTarget']).toBe(1);
  });
});

// ── submitKnightAction ────────────────────────────────────────────────────────

describe('MockGameService.submitKnightAction', () => {
  it('stores action in currentActions', async () => {
    const svc = makeService();
    const action = { type: 'strike', target: 1 };
    await firstValueFrom(svc.submitKnightAction('mock-game-1', 0, action));
    const game = await firstValueFrom(svc.getGame('mock-game-1'));
    expect((game.data as any)['currentActions']?.['0']).toEqual(action);
  });
});

// ── submitTrueFaceAction ──────────────────────────────────────────────────────

describe('MockGameService.submitTrueFaceAction', () => {
  it('stores guess in currentGuesses', async () => {
    const svc = makeService();
    const guess = { '1': 'Mafia', '2': 'Doctor' };
    await firstValueFrom(svc.submitTrueFaceAction('mock-game-1', 0, guess));
    const game = await firstValueFrom(svc.getGame('mock-game-1'));
    expect((game.data as any)['currentGuesses']?.['0']).toEqual(guess);
  });
});

// ── sendMessage / getMessages ─────────────────────────────────────────────────

describe('MockGameService.sendMessage / getMessages', () => {
  it('sendMessage returns a Message-like object', async () => {
    const svc = makeService();
    const msg = await firstValueFrom(svc.sendMessage('mock-game-1', 'Hello', 'day'));
    expect(msg).toBeTruthy();
  });

  it('getMessages returns an array with the sent message', async () => {
    const svc = makeService();
    await firstValueFrom(svc.sendMessage('mock-game-1', 'Hello', 'day'));
    const messages = await firstValueFrom(svc.getMessages('mock-game-1'));
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
  });
});

// ── emitUpdate ────────────────────────────────────────────────────────────────

describe('MockGameService.emitUpdate', () => {
  it('is a no-op and does not throw', async () => {
    const svc = makeService();
    const game = await firstValueFrom(svc.getGame('mock-game-1'));
    expect(() => svc.emitUpdate(game)).not.toThrow();
  });
});

// ── isCreator / getPlayerIndex / setPlayerIndex ───────────────────────────────

describe('MockGameService — creator/player index helpers', () => {
  it('isCreator returns true for mock-game-1', () => {
    const svc = makeService();
    expect(svc.isCreator('mock-game-1')).toBe(true);
  });

  it('getPlayerIndex returns 0 initially', () => {
    const svc = makeService();
    expect(svc.getPlayerIndex('mock-game-1')).toBe(0);
  });

  it('setPlayerIndex updates the value', () => {
    const svc = makeService();
    svc.setPlayerIndex('mock-game-1', 3);
    expect(svc.getPlayerIndex('mock-game-1')).toBe(3);
  });
});
