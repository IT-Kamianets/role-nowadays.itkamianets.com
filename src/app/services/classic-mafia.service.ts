import { Injectable } from '@angular/core';

export interface MafiaGameData {
  phase: 'lobby' | 'night' | 'day' | 'voting' | 'finished';
  round: number;
  roles: Record<string, string>;
  alive: number[];
  night: {
    mafiaTarget: number | null;
    doctorTarget: number | null;
    detectiveTarget: number | null;
    detectiveResult: 'mafia' | 'village' | null;
    // Extended roles (optional — Classic mode unaffected)
    bodyguardTarget?: number | null;
    sheriffTarget?: number | null;
    sheriffResult?: 'mafia' | 'city' | null;
    trackerTarget?: number | null;
    trackerResult?: number | null;
    watcherTarget?: number | null;
    watcherResult?: number[] | null;
    consigliereTarget?: number | null;
    consigliereResult?: string | null;
    roleblockerTarget?: number | null;
    poisonerTarget?: number | null;
    framerTarget?: number | null;
    serialKillerTarget?: number | null;
    arsonistTarget?: number | null;
    arsonistIgnite?: boolean | number;
    priestTarget?: number | null;
  };
  eliminated: number | null;
  winner: 'village' | 'mafia' | 'jester' | 'executioner' | 'serialkiller' | 'survivor' | null;
  doctorSelfHealed?: boolean;
  log: string[];
  votes: Record<string, number>;
  phaseStartedAt: number;
  dayMessages?: { sender: number; text: string }[];
  nightMessages?: { sender: number; text: string }[];
  settings?: {
    dayDuration: number;
    nightDuration: number;
    votingDuration: number;
  };
  // Extended optional fields
  poisoned?: { player: number; round: number }[];
  arsonistDoused?: number[];
  executionerTargets?: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class ClassicMafiaService {
  readonly ROLE_DEFS: Record<string, { team: 'city' | 'mafia'; description: string }> = {
    Mafia:     { team: 'mafia', description: 'Вночі обирає жертву для усунення.' },
    Detective: { team: 'city',  description: 'Вночі перевіряє гравця — мафія чи ні.' },
    Doctor:    { team: 'city',  description: 'Вночі рятує одного гравця від усунення.' },
    Villager:  { team: 'city',  description: 'Немає спеціальних здібностей. Голосуй мудро!' },
  };

  assignRoles(playerCount: number): string[] {
    let mafiaCount = playerCount <= 6 ? 1 : playerCount <= 9 ? 2 : 3;
    let detectiveCount = playerCount >= 14 ? 2 : 1;
    let doctorCount = 1;

    // Ensure special roles don't exceed player count
    const specialTotal = mafiaCount + detectiveCount + doctorCount;
    if (specialTotal > playerCount) {
      // Drop Detective first, then Doctor
      detectiveCount = Math.max(0, playerCount - mafiaCount - doctorCount);
      if (mafiaCount + doctorCount > playerCount) {
        doctorCount = Math.max(0, playerCount - mafiaCount);
      }
    }

    const villagerCount = Math.max(0, playerCount - mafiaCount - detectiveCount - doctorCount);
    const roles: string[] = [
      ...Array(mafiaCount).fill('Mafia'),
      ...Array(detectiveCount).fill('Detective'),
      ...Array(doctorCount).fill('Doctor'),
      ...Array(villagerCount).fill('Villager'),
    ];

    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    return roles;
  }

  initGameData(playerCount: number, settings?: { dayDuration: number; nightDuration: number; votingDuration: number }): MafiaGameData {
    const rolesArr = this.assignRoles(playerCount);
    const roles: Record<string, string> = {};
    rolesArr.forEach((r, i) => { roles[String(i)] = r; });

    return {
      phase: 'night',
      round: 1,
      roles,
      alive: Array.from({ length: playerCount }, (_, i) => i),
      night: { mafiaTarget: null, doctorTarget: null, detectiveTarget: null, detectiveResult: null },
      eliminated: null,
      winner: null,
      doctorSelfHealed: false,
      log: ['Гра розпочалась! Настала перша ніч.'],
      votes: {},
      phaseStartedAt: Date.now(),
      dayMessages: [],
      nightMessages: [],
      settings: settings ?? { dayDuration: 60, nightDuration: 30, votingDuration: 30 },
    };
  }

  resolveNight(data: MafiaGameData): { data: MafiaGameData; message: string } {
    const d: MafiaGameData = structuredClone(data);
    const { mafiaTarget, doctorTarget, detectiveTarget } = d.night;

    if (detectiveTarget !== null) {
      const role = d.roles[String(detectiveTarget)];
      d.night.detectiveResult = this.ROLE_DEFS[role]?.team === 'mafia' ? 'mafia' : 'village';
    }

    let message: string;
    d.eliminated = null;

    if (mafiaTarget !== null) {
      if (doctorTarget === mafiaTarget) {
        message = `Лікар врятував гравця ${mafiaTarget + 1}! Ніхто не загинув.`;
        d.log.push(`Раунд ${d.round}: Лікар врятував гравця ${mafiaTarget + 1}.`);
      } else {
        d.eliminated = mafiaTarget;
        d.alive = d.alive.filter(i => i !== mafiaTarget);
        message = `Гравець ${mafiaTarget + 1} загинув вночі.`;
        d.log.push(`Раунд ${d.round}: Гравець ${mafiaTarget + 1} (${d.roles[String(mafiaTarget)]}) загинув від руки мафії.`);
      }
    } else {
      message = 'Ніхто не загинув цієї ночі.';
      d.log.push(`Раунд ${d.round}: Ніхто не загинув.`);
    }

    d.phase = 'day';
    return { data: d, message };
  }

  checkWin(data: MafiaGameData): MafiaGameData['winner'] {
    const aliveRoles = data.alive.map(i => data.roles[String(i)]);
    const mafiaCount  = aliveRoles.filter(r => this.ROLE_DEFS[r]?.team === 'mafia').length;
    const villageCount = aliveRoles.filter(r => this.ROLE_DEFS[r]?.team === 'city').length;
    if (mafiaCount === 0) return 'village';
    if (mafiaCount >= villageCount) return 'mafia';
    return null;
  }

  resolveVoting(data: MafiaGameData, eliminatedIndex: number): MafiaGameData {
    const d: MafiaGameData = structuredClone(data);
    d.eliminated = eliminatedIndex;
    d.alive = d.alive.filter(i => i !== eliminatedIndex);
    d.log.push(`Раунд ${d.round}: Гравець ${eliminatedIndex + 1} (${d.roles[String(eliminatedIndex)]}) усунений голосуванням.`);
    d.round += 1;
    d.phase = 'night';
    d.night = { mafiaTarget: null, doctorTarget: null, detectiveTarget: null, detectiveResult: null };
    return d;
  }
}
