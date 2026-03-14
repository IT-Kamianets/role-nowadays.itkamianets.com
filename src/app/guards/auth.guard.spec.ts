import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@angular/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@angular/core')>();
  return { ...actual, inject: vi.fn() };
});

import { inject } from '@angular/core';
import { authGuard } from './auth.guard';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGameService(authenticated: boolean, nickname: string | null) {
  return {
    isAuthenticated: vi.fn().mockReturnValue(authenticated),
    getNickname: vi.fn().mockReturnValue(nickname),
  };
}

function makeRouter() {
  return { navigate: vi.fn() };
}

function runGuard(authenticated: boolean, nickname: string | null) {
  const gameService = makeGameService(authenticated, nickname);
  const router = makeRouter();
  (inject as ReturnType<typeof vi.fn>)
    .mockImplementationOnce(() => gameService)
    .mockImplementationOnce(() => router);
  const result = authGuard();
  return { result, gameService, router };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('authGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when authenticated and nickname is present', () => {
    const { result, router } = runGuard(true, 'Alice');
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('navigates to /home and returns false when not authenticated', () => {
    const { result, router } = runGuard(false, 'Alice');
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('navigates to /home and returns false when nickname is null', () => {
    const { result, router } = runGuard(true, null);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('navigates to /home and returns false when both unauthenticated and no nickname', () => {
    const { result, router } = runGuard(false, null);
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });
});
