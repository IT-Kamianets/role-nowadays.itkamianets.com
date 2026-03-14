import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearAuthStorage } from './auth.interceptor';

// ── localStorage stub (Node has no localStorage) ────────────────────────────
// Uses a Proxy so Object.keys(localStorage) enumerates stored data keys —
// the same way the real localStorage works.

const store: Record<string, string> = {};
const METHODS: Record<string, unknown> = {
  getItem:    (k: string) => store[k] ?? null,
  setItem:    (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
  key:        (i: number) => Object.keys(store)[i] ?? null,
};
const lsMock = new Proxy(store, {
  get(_t, prop: string) {
    if (prop === 'length') return Object.keys(store).length;
    return METHODS[prop] ?? store[prop];
  },
  ownKeys:                  () => Object.keys(store),
  getOwnPropertyDescriptor: (_t, prop: string) => ({
    value: store[prop as string], writable: true, enumerable: true, configurable: true,
  }),
}) as unknown as Storage;

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  vi.stubGlobal('localStorage', lsMock);
});

// ── clearAuthStorage ─────────────────────────────────────────────────────────

describe('clearAuthStorage', () => {
  it('removes the token key', () => {
    store['token'] = 'eyJhbGciOi...';
    clearAuthStorage();
    expect(store['token']).toBeUndefined();
  });

  it('removes the nickname key', () => {
    store['nickname'] = 'Alice';
    clearAuthStorage();
    expect(store['nickname']).toBeUndefined();
  });

  it('removes all isCreator_ prefixed keys', () => {
    store['isCreator_abc123'] = 'true';
    store['isCreator_def456'] = 'true';
    clearAuthStorage();
    expect(store['isCreator_abc123']).toBeUndefined();
    expect(store['isCreator_def456']).toBeUndefined();
  });

  it('removes all playerIndex_ prefixed keys', () => {
    store['playerIndex_abc123'] = '2';
    store['playerIndex_xyz789'] = '0';
    clearAuthStorage();
    expect(store['playerIndex_abc123']).toBeUndefined();
    expect(store['playerIndex_xyz789']).toBeUndefined();
  });

  it('removes all gameSettings_ prefixed keys', () => {
    store['gameSettings_abc123'] = '{"dayDuration":60}';
    clearAuthStorage();
    expect(store['gameSettings_abc123']).toBeUndefined();
  });

  it('does NOT remove unrelated keys', () => {
    store['someOtherKey'] = 'keep-me';
    store['token'] = 'tok';
    clearAuthStorage();
    expect(store['someOtherKey']).toBe('keep-me');
  });

  it('is safe to call when localStorage is empty (no errors)', () => {
    expect(() => clearAuthStorage()).not.toThrow();
  });

  it('removes multiple key types in one call', () => {
    store['token']            = 'tok';
    store['nickname']         = 'Bob';
    store['isCreator_aaa']    = 'true';
    store['playerIndex_aaa']  = '1';
    store['gameSettings_aaa'] = '{}';
    store['unrelated']        = 'keep';

    clearAuthStorage();

    expect(store['token']).toBeUndefined();
    expect(store['nickname']).toBeUndefined();
    expect(store['isCreator_aaa']).toBeUndefined();
    expect(store['playerIndex_aaa']).toBeUndefined();
    expect(store['gameSettings_aaa']).toBeUndefined();
    expect(store['unrelated']).toBe('keep');
  });

  it('does not throw when localStorage throws (Safari private mode)', () => {
    const brokenLs = {
      getItem:    () => { throw new Error('QuotaExceededError'); },
      setItem:    () => { throw new Error('QuotaExceededError'); },
      removeItem: () => { throw new Error('QuotaExceededError'); },
      get length() { throw new Error('QuotaExceededError'); },
      key:  () => { throw new Error('QuotaExceededError'); },
      clear: () => { throw new Error('QuotaExceededError'); },
    };
    vi.stubGlobal('localStorage', brokenLs);
    expect(() => clearAuthStorage()).not.toThrow();
  });
});
