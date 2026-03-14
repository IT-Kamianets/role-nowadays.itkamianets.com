import { Injectable } from '@angular/core';

export type KnightRole = 'Attacker' | 'Healer' | 'Defender';
export type KnightPhase = 'lobby' | 'action' | 'results' | 'finished';

export interface KnightAction {
  type: 'strike' | 'heal' | 'overheal' | 'guard';
  target: number;
}

export interface KnightPlayerState {
  role: KnightRole;
  hp: number;
  maxHp: number;
  alive: boolean;
  lockedTarget: number | null;
  lockExpiresAfterRound: number;
  pendingPenalty: boolean;
}

export interface KnightGameData {
  phase: KnightPhase;
  round: number;
  players: Record<string, KnightPlayerState>;
  currentActions: Record<string, KnightAction | null>;
  roundHistory: { round: number; events: string[]; hpDelta: Record<string, number>; actions: Record<string, KnightAction | null> }[];
  winner: number | null;
  roundStartedAt: number;
  settings: { roundDuration: number };
}

const MAX_HP: Record<KnightRole, number> = { Attacker: 7, Healer: 8, Defender: 10 };

@Injectable({ providedIn: 'root' })
export class KnightService {

  assignRoles(playerCount: number): KnightRole[] {
    const roles: KnightRole[] = ['Defender', 'Healer'];
    for (let i = 2; i < playerCount; i++) roles.push('Attacker');
    // shuffle
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    return roles;
  }

  initGameData(playerCount: number, settings: { roundDuration: number }): KnightGameData {
    const roles = this.assignRoles(playerCount);
    const players: Record<string, KnightPlayerState> = {};
    for (let i = 0; i < playerCount; i++) {
      const role = roles[i];
      players[String(i)] = {
        role,
        hp: MAX_HP[role],
        maxHp: MAX_HP[role],
        alive: true,
        lockedTarget: null,
        lockExpiresAfterRound: 0,
        pendingPenalty: false,
      };
    }
    return {
      phase: 'action',
      round: 1,
      players,
      currentActions: {},
      roundHistory: [],
      winner: null,
      roundStartedAt: Date.now(),
      settings,
    };
  }

  submitAction(playerIdx: number, action: KnightAction, data: KnightGameData): KnightGameData {
    const d = this.deepClone(data);
    const key = String(playerIdx);
    const player = d.players[key];
    if (!player || !player.alive) return d;

    const prevAction = d.currentActions[key];
    const isLocked = player.lockedTarget !== null && d.round <= player.lockExpiresAfterRound;

    if (isLocked && prevAction === undefined) {
      // First submission this round with a lock — check if target matches
      if (action.target !== player.lockedTarget) {
        player.pendingPenalty = true;
      }
    } else if (prevAction && prevAction.target !== action.target && isLocked) {
      // Changing target while locked
      player.pendingPenalty = true;
    }

    d.currentActions[key] = action;
    return d;
  }

  resolveRound(data: KnightGameData): { data: KnightGameData; events: string[] } {
    const d = this.deepClone(data);
    const events: string[] = [];
    const hpDelta: Record<string, number> = {};
    const playerCount = Object.keys(d.players).length;

    const delta = (key: string, amount: number) => {
      hpDelta[key] = (hpDelta[key] ?? 0) + amount;
    };

    // 1. Apply pending penalties
    for (const [key, player] of Object.entries(d.players)) {
      if (player.alive && player.pendingPenalty) {
        delta(key, -1);
        events.push(`Гравець ${+key + 1} (${this.roleLabel(player.role)}) отримав -1 HP за зміну цілі`);
        player.pendingPenalty = false;
      }
    }

    // 2. Guard — Defender -1 HP, build guardMap
    const guardMap: Record<number, number> = {}; // target -> defender index
    for (const [key, action] of Object.entries(d.currentActions)) {
      if (!action || action.type !== 'guard') continue;
      const player = d.players[key];
      if (!player?.alive) continue;
      delta(key, -1);
      guardMap[action.target] = +key;
      events.push(`Гравець ${+key + 1} (Захисник) захищає Гравця ${action.target + 1}`);
    }

    // 3. Heal / Overheal
    for (const [key, action] of Object.entries(d.currentActions)) {
      if (!action || (action.type !== 'heal' && action.type !== 'overheal')) continue;
      const player = d.players[key];
      if (!player?.alive) continue;
      const target = d.players[String(action.target)];
      if (!target?.alive) continue;
      if (action.type === 'heal') {
        delta(String(action.target), +2);
        events.push(`Гравець ${+key + 1} (Лікар) лікує Гравця ${action.target + 1} на +2 HP`);
      } else {
        // overheal: healer -1 HP, target +3 HP
        delta(key, -1);
        delta(String(action.target), +3);
        events.push(`Гравець ${+key + 1} (Лікар) надлікує Гравця ${action.target + 1} на +3 HP (собі -1 HP)`);
      }
    }

    // 4. Strike — track previous strike targets
    for (const [key, action] of Object.entries(d.currentActions)) {
      if (!action || action.type !== 'strike') continue;
      const player = d.players[key];
      if (!player?.alive) continue;
      const targetKey = String(action.target);
      const target = d.players[targetKey];
      if (!target?.alive) continue;

      // Check if same target 2 rounds in a row
      const prevRound = d.roundHistory[d.roundHistory.length - 1];
      const prevAction = prevRound
        ? this.findPrevStrike(prevRound, +key, action.target)
        : false;

      const damage = prevAction ? 4 : 2;

      const guardDefenderIdx = guardMap[action.target];
      if (guardDefenderIdx !== undefined) {
        // Guard absorbs 3 damage, Counter Guard: attacker -1 HP
        const absorbed = Math.min(3, damage);
        const remaining = damage - absorbed;
        delta(targetKey, -remaining);
        delta(key, -1); // counter guard
        events.push(
          `Гравець ${+key + 1} (Атакер) атакує Гравця ${action.target + 1} на ${damage} шкоди — Захисник поглинув ${absorbed}, залишилось ${remaining}; Атакер отримав -1 HP`
        );
      } else {
        delta(targetKey, -damage);
        events.push(
          `Гравець ${+key + 1} (Атакер) атакує Гравця ${action.target + 1} на ${damage} шкоди`
          + (prevAction ? ' (подвійний удар!)' : '')
        );
      }
    }

    // 5. Apply hpDelta, clamp to maxHp, mark dead
    for (const [key, player] of Object.entries(d.players)) {
      if (!player.alive) continue;
      const change = hpDelta[key] ?? 0;
      player.hp = Math.min(player.maxHp, player.hp + change);
      if (player.hp <= 0) {
        player.hp = 0;
        player.alive = false;
        events.push(`Гравець ${+key + 1} (${this.roleLabel(player.role)}) загинув!`);
      }
    }

    // 6. Update Action Commitment locks
    for (const [key, action] of Object.entries(d.currentActions)) {
      if (!action) continue;
      const player = d.players[key];
      if (!player?.alive) continue;
      if (player.lockedTarget === null) {
        // First time targeting — lock for 2 rounds
        player.lockedTarget = action.target;
        player.lockExpiresAfterRound = d.round + 1;
      } else if (action.target === player.lockedTarget) {
        // Extending lock
        player.lockExpiresAfterRound = d.round + 1;
      } else {
        // Changed target — update lock
        player.lockedTarget = action.target;
        player.lockExpiresAfterRound = d.round + 1;
      }
    }

    // 7. Record history (зберігаємо самі дії, щоб не парсити рядки)
    d.roundHistory.push({ round: d.round, events: [...events], hpDelta, actions: { ...d.currentActions } });
    d.currentActions = {};
    d.round++;
    d.roundStartedAt = Date.now();

    // 8. Check win
    const winner = this.checkWin(d);
    if (winner !== null) {
      d.winner = winner;
      d.phase = 'finished';
    } else {
      d.phase = 'results';
    }

    return { data: d, events };
  }

  checkWin(data: KnightGameData): number | null {
    const alive = Object.entries(data.players).filter(([, p]) => p.alive);
    if (alive.length === 1) return +alive[0][0];
    if (alive.length === 0) return -1; // draw
    return null;
  }

  private findPrevStrike(
    prevRound: { round: number; events: string[]; hpDelta: Record<string, number>; actions: Record<string, KnightAction | null> },
    attackerIdx: number,
    targetIdx: number
  ): boolean {
    const prevAction = prevRound.actions?.[String(attackerIdx)];
    return prevAction?.type === 'strike' && prevAction.target === targetIdx;
  }

  private roleLabel(role: KnightRole): string {
    return role === 'Attacker' ? 'Атакер' : role === 'Healer' ? 'Лікар' : 'Захисник';
  }

  private deepClone<T>(obj: T): T {
    return structuredClone(obj);
  }
}
