import { describe, it, expect } from 'vitest';
import { calcSecondsLeft, calcLobbySecondsLeft } from './phase-timer';

// ── calcSecondsLeft ───────────────────────────────────────────────────────────

describe('calcSecondsLeft — normal countdown', () => {
  it('returns full duration when no time has elapsed', () => {
    const now = 1_000_000;
    expect(calcSecondsLeft(now, 60, false, now)).toBe(60);
  });

  it('decrements by elapsed seconds', () => {
    const start = 1_000_000;
    const now = start + 20_000; // 20 seconds later
    expect(calcSecondsLeft(start, 60, false, now)).toBe(40);
  });

  it('returns 0 when duration has expired (no negative values)', () => {
    const start = 1_000_000;
    const now = start + 120_000; // 120 seconds later, duration=60
    expect(calcSecondsLeft(start, 60, false, now)).toBe(0);
  });

  it('returns exactly 0 at expiry boundary', () => {
    const start = 1_000_000;
    const now = start + 60_000;
    expect(calcSecondsLeft(start, 60, false, now)).toBe(0);
  });

  it('handles duration of 30 seconds', () => {
    const start = 1_000_000;
    const now = start + 10_000;
    expect(calcSecondsLeft(start, 30, false, now)).toBe(20);
  });

  it('floors elapsed seconds (sub-second precision ignored)', () => {
    const start = 1_000_000;
    const now = start + 10_999; // 10.999 seconds = floor to 10
    expect(calcSecondsLeft(start, 60, false, now)).toBe(50);
  });
});

describe('calcSecondsLeft — revealActive freezes timer', () => {
  it('returns full duration when revealActive=true regardless of elapsed time', () => {
    const start = 1_000_000;
    const now = start + 50_000; // 50 seconds elapsed
    expect(calcSecondsLeft(start, 60, true, now)).toBe(60);
  });

  it('returns full duration even when expired if revealActive=true', () => {
    const start = 1_000_000;
    const now = start + 200_000; // well past expiry
    expect(calcSecondsLeft(start, 30, true, now)).toBe(30);
  });
});

// ── calcLobbySecondsLeft ──────────────────────────────────────────────────────

describe('calcLobbySecondsLeft', () => {
  it('returns maxSecs when game was just created', () => {
    // Create a fake ObjectId-like hex where first 8 chars encode "now" in seconds
    const nowMs = 1_700_000_000_000; // some fixed timestamp
    const createdSec = Math.floor(nowMs / 1000);
    const fakeGameId = createdSec.toString(16).padStart(8, '0') + '000000000000000000';
    expect(calcLobbySecondsLeft(fakeGameId, 1200, nowMs)).toBe(1200);
  });

  it('decrements by elapsed time', () => {
    const createdMs = 1_700_000_000_000;
    const createdSec = Math.floor(createdMs / 1000);
    const fakeGameId = createdSec.toString(16).padStart(8, '0') + '000000000000000000';
    const nowMs = createdMs + 300_000; // 5 minutes later
    expect(calcLobbySecondsLeft(fakeGameId, 1200, nowMs)).toBe(900);
  });

  it('returns 0 when lobby has expired', () => {
    const createdMs = 1_700_000_000_000;
    const createdSec = Math.floor(createdMs / 1000);
    const fakeGameId = createdSec.toString(16).padStart(8, '0') + '000000000000000000';
    const nowMs = createdMs + 2_000_000; // well past 1200s
    expect(calcLobbySecondsLeft(fakeGameId, 1200, nowMs)).toBe(0);
  });

  it('respects custom maxSecs', () => {
    const nowMs = 1_700_000_000_000;
    const createdSec = Math.floor(nowMs / 1000);
    const fakeGameId = createdSec.toString(16).padStart(8, '0') + '000000000000000000';
    const later = nowMs + 30_000;
    expect(calcLobbySecondsLeft(fakeGameId, 600, later)).toBe(570);
  });
});
