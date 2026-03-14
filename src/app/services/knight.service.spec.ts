import { describe, it, expect } from 'vitest';
import { KnightService, KnightGameData, KnightPlayerState } from './knight.service';

function makeService() {
  return new KnightService();
}

function makeGameData(players: Record<string, KnightPlayerState>, round = 1): KnightGameData {
  return {
    phase: 'action',
    round,
    players,
    currentActions: {},
    roundHistory: [],
    winner: null,
    roundStartedAt: 0,
    settings: { roundDuration: 60 },
  };
}

function makePlayer(role: KnightPlayerState['role'], hp: number): KnightPlayerState {
  return {
    role,
    hp,
    maxHp: hp,
    alive: true,
    lockedTarget: null,
    lockExpiresAfterRound: 0,
    pendingPenalty: false,
  };
}

describe('KnightService.resolveRound — Attacker strikes Healer', () => {
  it('reduces Healer HP by 2 on first strike', () => {
    const svc = makeService();
    const data = makeGameData({
      '0': makePlayer('Attacker', 7),
      '1': makePlayer('Healer', 8),
    });
    data.currentActions['0'] = { type: 'strike', target: 1 };

    const { data: result } = svc.resolveRound(data);
    expect(result.players['1'].hp).toBe(6); // 8 - 2
  });

  it('reduces Attacker HP by 1 when Defender guards the target', () => {
    const svc = makeService();
    const data = makeGameData({
      '0': makePlayer('Attacker', 7),
      '1': makePlayer('Healer', 8),
      '2': makePlayer('Defender', 10),
    });
    data.currentActions['0'] = { type: 'strike', target: 1 };
    data.currentActions['2'] = { type: 'guard', target: 1 };

    const { data: result } = svc.resolveRound(data);
    // Guard absorbs up to 3 damage, first strike = 2 → all absorbed, remaining = 0
    // Healer takes 0 extra damage from strike (guard absorbed all), but guard itself costs Defender -1
    expect(result.players['0'].hp).toBe(6); // Attacker: 7 - 1 counter guard
    expect(result.players['1'].hp).toBe(8); // Healer: no damage (guard absorbed all 2)
    expect(result.players['2'].hp).toBe(9); // Defender: 10 - 1 guard cost
  });
});

describe('KnightService.resolveRound — HP ≤ 0 → player eliminated', () => {
  it('marks player as not alive when HP drops to 0', () => {
    const svc = makeService();
    const weakHealer = makePlayer('Healer', 2);
    const data = makeGameData({
      '0': makePlayer('Attacker', 7),
      '1': weakHealer,
    });
    data.currentActions['0'] = { type: 'strike', target: 1 };

    const { data: result } = svc.resolveRound(data);
    expect(result.players['1'].hp).toBe(0);
    expect(result.players['1'].alive).toBe(false);
  });

  it('sets winner when only one player remains', () => {
    const svc = makeService();
    const data = makeGameData({
      '0': makePlayer('Attacker', 7),
      '1': makePlayer('Healer', 2),
    });
    data.currentActions['0'] = { type: 'strike', target: 1 };

    const { data: result } = svc.resolveRound(data);
    expect(result.winner).toBe(0);
    expect(result.phase).toBe('finished');
  });
});

describe('KnightService.resolveRound — Healer heals', () => {
  it('increases target HP by 2 (not exceeding maxHp)', () => {
    const svc = makeService();
    // Attacker with maxHp=7 but currently at 4 HP (damaged)
    const attackerPlayer: KnightPlayerState = { ...makePlayer('Attacker', 7), hp: 4 };
    const healerPlayer = makePlayer('Healer', 8);
    const data = makeGameData({
      '0': attackerPlayer,
      '1': healerPlayer,
    });
    data.currentActions['1'] = { type: 'heal', target: 0 };

    const { data: result } = svc.resolveRound(data);
    expect(result.players['0'].hp).toBe(6); // 4 + 2 = 6, not clamped (maxHp=7)
  });
});
