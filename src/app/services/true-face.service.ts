import { Injectable } from '@angular/core';

export type TrueFacePhase = 'lobby' | 'guessing' | 'results' | 'finished';

export interface TrueFaceGuess {
  [targetPlayerIndex: string]: string; // playerIndex -> role name
}

export interface TrueFacePlayerState {
  role: string;
  score: number;
}

export interface TrueFaceRoundResult {
  round: number;
  correctCounts: Record<string, number>; // playerIndex -> к-сть правильних у цьому раунді
  solvedBy: number[];
}

export interface TrueFaceGameData {
  phase: TrueFacePhase;
  round: number;
  roundLimit: number;
  players: Record<string, TrueFacePlayerState>;
  currentGuesses: Record<string, TrueFaceGuess | null>;
  roundHistory: TrueFaceRoundResult[];
  winners: number[];
  roundStartedAt: number;
  settings: {
    roles: string[];
    roundDuration: number | null;
  };
}

@Injectable({ providedIn: 'root' })
export class TrueFaceService {

  assignRoles(playerCount: number, roles: string[]): string[] {
    const assigned: string[] = [];
    for (let i = 0; i < playerCount; i++) {
      assigned.push(roles[Math.floor(Math.random() * roles.length)]);
    }
    return assigned;
  }

  initGameData(
    playerCount: number,
    settings: { roles: string[]; roundLimit: number; roundDuration: number | null }
  ): TrueFaceGameData {
    const assigned = this.assignRoles(playerCount, settings.roles);
    const players: Record<string, TrueFacePlayerState> = {};
    for (let i = 0; i < playerCount; i++) {
      players[String(i)] = { role: assigned[i], score: 0 };
    }
    return {
      phase: 'guessing',
      round: 1,
      roundLimit: settings.roundLimit,
      players,
      currentGuesses: {},
      roundHistory: [],
      winners: [],
      roundStartedAt: Date.now(),
      settings: { roles: settings.roles, roundDuration: settings.roundDuration },
    };
  }

  resolveRound(data: TrueFaceGameData): TrueFaceGameData {
    const d = this.deepClone(data);
    const playerCount = Object.keys(d.players).length;
    const correctCounts: Record<string, number> = {};
    const solvedBy: number[] = [];

    for (let i = 0; i < playerCount; i++) {
      const key = String(i);
      const guess = d.currentGuesses[key];
      if (!guess) { correctCounts[key] = 0; continue; }

      let correct = 0;
      for (let j = 0; j < playerCount; j++) {
        if (j === i) continue;
        const jKey = String(j);
        if (guess[jKey] === d.players[jKey].role) correct++;
      }
      correctCounts[key] = correct;
      d.players[key].score += correct;

      if (correct === playerCount - 1) solvedBy.push(i);
    }

    d.roundHistory.push({ round: d.round, correctCounts, solvedBy });
    d.currentGuesses = {};

    if (solvedBy.length > 0) {
      d.phase = 'finished';
      d.winners = solvedBy;
    } else if (d.round >= d.roundLimit) {
      d.phase = 'finished';
      d.winners = [];
    } else {
      d.phase = 'results';
      d.round++;
      d.roundStartedAt = Date.now();
    }

    return d;
  }

  checkWin(data: TrueFaceGameData): number[] {
    return data.winners;
  }

  private deepClone<T>(obj: T): T {
    return structuredClone(obj);
  }
}
