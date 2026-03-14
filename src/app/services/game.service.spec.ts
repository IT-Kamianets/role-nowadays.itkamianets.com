import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { GameService } from './game.service';

// ── Minimal mocks ─────────────────────────────────────────────────────────────

function makeHttp(overrides: Partial<{ get: any; post: any }> = {}) {
  return {
    get: vi.fn().mockReturnValue(of([])),
    post: vi.fn().mockReturnValue(of(null)),
    ...overrides,
  } as any;
}

function makeSocket() {
  return { emit: vi.fn() } as any;
}

function makeService(httpOverrides: Partial<{ get: any; post: any }> = {}) {
  return new GameService(makeHttp(httpOverrides), makeSocket());
}

// ── In-memory localStorage stub (node has no localStorage) ────────────────────

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  vi.stubGlobal('localStorage', localStorageMock);
});

// ── isAuthenticated ───────────────────────────────────────────────────────────

describe('GameService.isAuthenticated', () => {
  it('returns false when no token in localStorage', () => {
    const svc = makeService();
    expect(svc.isAuthenticated()).toBe(false);
  });

  it('returns true when token exists', () => {
    store['token'] = 'tok123';
    const svc = makeService();
    expect(svc.isAuthenticated()).toBe(true);
  });
});

// ── getNickname / setNickname ─────────────────────────────────────────────────

describe('GameService.getNickname / setNickname', () => {
  it('returns empty string when no nickname stored', () => {
    expect(makeService().getNickname()).toBe('');
  });

  it('setNickname trims whitespace', () => {
    const svc = makeService();
    svc.setNickname('  Alice  ');
    expect(svc.getNickname()).toBe('Alice');
  });

  it('setNickname stores and getNickname retrieves', () => {
    const svc = makeService();
    svc.setNickname('Bob');
    expect(svc.getNickname()).toBe('Bob');
  });
});

// ── setCreator / isCreator ────────────────────────────────────────────────────

describe('GameService.setCreator / isCreator', () => {
  it('isCreator returns false for unknown game', () => {
    expect(makeService().isCreator('game1')).toBe(false);
  });

  it('isCreator returns true after setCreator', () => {
    const svc = makeService();
    svc.setCreator('game1', 0);
    expect(svc.isCreator('game1')).toBe(true);
  });

  it('setCreator also sets player index to 0', () => {
    const svc = makeService();
    svc.setCreator('game1', 0);
    expect(svc.getPlayerIndex('game1')).toBe(0);
  });
});

// ── setPlayerIndex / getPlayerIndex ──────────────────────────────────────────

describe('GameService.setPlayerIndex / getPlayerIndex', () => {
  it('returns -1 when no index stored', () => {
    expect(makeService().getPlayerIndex('game1')).toBe(-1);
  });

  it('stores and retrieves player index', () => {
    const svc = makeService();
    svc.setPlayerIndex('game1', 3);
    expect(svc.getPlayerIndex('game1')).toBe(3);
  });

  it('different games have independent indexes', () => {
    const svc = makeService();
    svc.setPlayerIndex('gameA', 1);
    svc.setPlayerIndex('gameB', 5);
    expect(svc.getPlayerIndex('gameA')).toBe(1);
    expect(svc.getPlayerIndex('gameB')).toBe(5);
  });
});

// ── getGames ──────────────────────────────────────────────────────────────────

describe('GameService.getGames', () => {
  it('returns empty array on HTTP error', () => {
    const svc = makeService({ get: vi.fn().mockReturnValue(throwError(() => new Error('net'))) });
    let result: any;
    svc.getGames().subscribe(v => (result = v));
    expect(result).toEqual([]);
  });

  it('returns games on success', () => {
    const games = [{ _id: '1' }, { _id: '2' }];
    const svc = makeService({ get: vi.fn().mockReturnValue(of(games)) });
    let result: any;
    svc.getGames().subscribe(v => (result = v));
    expect(result).toEqual(games);
  });
});

// ── sendMessage ───────────────────────────────────────────────────────────────

describe('GameService.sendMessage', () => {
  it('returns null on HTTP error', () => {
    const svc = makeService({ post: vi.fn().mockReturnValue(throwError(() => new Error('net'))) });
    let result: any = 'not set';
    svc.sendMessage('g1', 'hello', 'day').subscribe(v => (result = v));
    expect(result).toBeNull();
  });

  it('returns message on success', () => {
    const msg = { _id: 'm1', text: 'hello' };
    const svc = makeService({ post: vi.fn().mockReturnValue(of(msg)) });
    let result: any;
    svc.sendMessage('g1', 'hello', 'day').subscribe(v => (result = v));
    expect(result).toEqual(msg);
  });
});

// ── getMessages ───────────────────────────────────────────────────────────────

describe('GameService.getMessages', () => {
  it('returns empty array on HTTP error', () => {
    const svc = makeService({ post: vi.fn().mockReturnValue(throwError(() => new Error('net'))) });
    let result: any;
    svc.getMessages('g1').subscribe(v => (result = v));
    expect(result).toEqual([]);
  });
});

// ── joinGame ──────────────────────────────────────────────────────────────────

describe('GameService.joinGame', () => {
  it('returns false on HTTP error', () => {
    const svc = makeService({ post: vi.fn().mockReturnValue(throwError(() => new Error('net'))) });
    let result: any = 'not set';
    svc.joinGame('g1').subscribe(v => (result = v));
    expect(result).toBe(false);
  });

  it('stores player index by nickname match on success', () => {
    store['nickname'] = 'Alice';
    const game = {
      _id: 'g1',
      players: [{ name: 'Bob', _id: 'u1' }, { name: 'Alice', _id: 'u2' }],
    };
    const svc = makeService({ post: vi.fn().mockReturnValue(of(game)) });
    svc.joinGame('g1').subscribe();
    expect(svc.getPlayerIndex('g1')).toBe(1);
  });
});

// ── localStorage try/catch resilience ────────────────────────────────────────

describe('GameService localStorage try/catch', () => {
  it('does not throw when localStorage.setItem throws (Safari private mode)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('SecurityError'); },
      removeItem: () => {},
    });
    const svc = makeService();
    expect(() => svc.setNickname('Alice')).not.toThrow();
    expect(() => svc.setCreator('g1', 0)).not.toThrow();
    expect(() => svc.setPlayerIndex('g1', 2)).not.toThrow();
  });

  it('returns safe defaults when localStorage.getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => {},
      removeItem: () => {},
    });
    const svc = makeService();
    expect(svc.isAuthenticated()).toBe(false);
    expect(svc.getNickname()).toBe('');
    expect(svc.getPlayerIndex('g1')).toBe(-1);
    expect(svc.isCreator('g1')).toBe(false);
  });
});
