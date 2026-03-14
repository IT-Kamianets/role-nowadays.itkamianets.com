import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── socket.io-client mock ─────────────────────────────────────────────────────

type EventHandler = (...args: any[]) => void;

function makeSocketMock() {
  const handlers: Record<string, EventHandler> = {};
  return {
    on: vi.fn((event: string, cb: EventHandler) => { handlers[event] = cb; }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    _trigger: (event: string, ...args: any[]) => handlers[event]?.(...args),
  };
}

let socketMock = makeSocketMock();
const ioMock = vi.fn(() => socketMock);

vi.mock('socket.io-client', () => ({ io: ioMock }));

// ── environment / localStorage stubs ─────────────────────────────────────────

vi.mock('../../environments/environment', () => ({
  environment: { apiBase: 'http://test-server' },
}));

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

// ── helpers ───────────────────────────────────────────────────────────────────

async function importService() {
  const { SocketService } = await import('./socket.service');
  return new SocketService();
}

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  socketMock = makeSocketMock();
  ioMock.mockReturnValue(socketMock);
  ioMock.mockClear();
  Object.keys(store).forEach(k => delete store[k]);
  vi.stubGlobal('localStorage', localStorageMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SocketService.connect()', () => {
  it('calls io() with the correct URL', async () => {
    const svc = await importService();
    svc.connect();
    expect(ioMock).toHaveBeenCalledWith(
      'http://test-server',
      expect.objectContaining({ reconnection: true }),
    );
  });

  it('passes the token from localStorage in auth', async () => {
    store['token'] = 'my-jwt-token';
    const svc = await importService();
    svc.connect();
    expect(ioMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'my-jwt-token' } }),
    );
  });

  it('passes undefined auth token when localStorage has none', async () => {
    const svc = await importService();
    svc.connect();
    expect(ioMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: undefined } }),
    );
  });

  it('is idempotent — second call does not create a new socket', async () => {
    const svc = await importService();
    svc.connect();
    svc.connect();
    expect(ioMock).toHaveBeenCalledTimes(1);
  });

  it('registers a gamerole listener on the socket', async () => {
    const svc = await importService();
    svc.connect();
    const calls = (socketMock.on as ReturnType<typeof vi.fn>).mock.calls.map(([e]) => e);
    expect(calls).toContain('gamerole');
  });
});

describe('SocketService.onGameUpdate()', () => {
  it('emits when gamerole event fires', async () => {
    const svc = await importService();
    svc.connect();
    const results: any[] = [];
    svc.onGameUpdate().subscribe(g => results.push(g));
    const game = { _id: 'abc', players: [] } as any;
    socketMock._trigger('gamerole', game);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(game);
  });
});

describe('SocketService.joinRoom()', () => {
  it('emits join-room with the game ID', async () => {
    const svc = await importService();
    svc.connect();
    svc.joinRoom('room-123');
    expect(socketMock.emit).toHaveBeenCalledWith('join-room', 'room-123');
  });

  it('stores _currentRoomId', async () => {
    const svc = await importService();
    svc.connect();
    svc.joinRoom('room-456');
    // verify by triggering reconnect — it should re-emit join-room
    socketMock._trigger('reconnect', 1);
    expect(socketMock.emit).toHaveBeenCalledWith('join-room', 'room-456');
  });
});

describe('SocketService reconnect event', () => {
  it('re-emits join-room when _currentRoomId is set', async () => {
    const svc = await importService();
    svc.connect();
    svc.joinRoom('room-789');
    socketMock.emit.mockClear();
    socketMock._trigger('reconnect', 2);
    expect(socketMock.emit).toHaveBeenCalledWith('join-room', 'room-789');
  });

  it('fires reconnect$ observable', async () => {
    const svc = await importService();
    svc.connect();
    let fired = false;
    svc.onReconnect().subscribe(() => { fired = true; });
    socketMock._trigger('reconnect', 1);
    expect(fired).toBe(true);
  });

  it('does not emit join-room if no room was joined', async () => {
    const svc = await importService();
    svc.connect();
    socketMock._trigger('reconnect', 1);
    expect(socketMock.emit).not.toHaveBeenCalledWith('join-room', expect.anything());
  });
});

describe('SocketService.onConnectionError()', () => {
  it('emits the error message on connect_error', async () => {
    const svc = await importService();
    svc.connect();
    const messages: string[] = [];
    svc.onConnectionError().subscribe(m => messages.push(m));
    socketMock._trigger('connect_error', new Error('Unauthorized'));
    expect(messages).toEqual(['Unauthorized']);
  });
});

describe('SocketService.emit()', () => {
  it('emits gamerole event with the game object', async () => {
    const svc = await importService();
    svc.connect();
    const game = { _id: 'xyz', players: [] } as any;
    svc.emit(game);
    expect(socketMock.emit).toHaveBeenCalledWith('gamerole', game);
  });
});

describe('SocketService.ngOnDestroy()', () => {
  it('disconnects the socket', async () => {
    const svc = await importService();
    svc.connect();
    svc.ngOnDestroy();
    expect(socketMock.disconnect).toHaveBeenCalled();
  });
});
