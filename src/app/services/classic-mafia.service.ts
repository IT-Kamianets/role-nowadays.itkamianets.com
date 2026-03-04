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
  };
  eliminated: number | null;
  winner: 'village' | 'mafia' | null;
  log: string[];
  votes: Record<string, number>;
  phaseStartedAt: number;
  dayMessages?: { sender: number; text: string }[];
  nightMessages?: { sender: number; text: string }[];
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
    let mafiaCount: number;
    let detectiveCount: number;
    const doctorCount = 1;

    if (playerCount <= 6)       { mafiaCount = 1; detectiveCount = 1; }
    else if (playerCount <= 9)  { mafiaCount = 2; detectiveCount = 1; }
    else if (playerCount <= 12) { mafiaCount = 3; detectiveCount = 1; }
    else                        { mafiaCount = 3; detectiveCount = 2; }

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

  initGameData(playerCount: number): MafiaGameData {
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
      log: ['Гра розпочалась! Настала перша ніч.'],
      votes: {},
      phaseStartedAt: Date.now(),
      dayMessages: [],
      nightMessages: [],
    };
  }

  resolveNight(data: MafiaGameData): { data: MafiaGameData; message: string } {
    const d: MafiaGameData = JSON.parse(JSON.stringify(data));
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

  checkWin(data: MafiaGameData): 'village' | 'mafia' | null {
    const aliveRoles = data.alive.map(i => data.roles[String(i)]);
    const mafiaCount  = aliveRoles.filter(r => this.ROLE_DEFS[r]?.team === 'mafia').length;
    const villageCount = aliveRoles.filter(r => this.ROLE_DEFS[r]?.team === 'city').length;
    if (mafiaCount === 0) return 'village';
    if (mafiaCount >= villageCount) return 'mafia';
    return null;
  }

  resolveVoting(data: MafiaGameData, eliminatedIndex: number): MafiaGameData {
    const d: MafiaGameData = JSON.parse(JSON.stringify(data));
    d.eliminated = eliminatedIndex;
    d.alive = d.alive.filter(i => i !== eliminatedIndex);
    d.log.push(`Раунд ${d.round}: Гравець ${eliminatedIndex + 1} (${d.roles[String(eliminatedIndex)]}) усунений голосуванням.`);
    d.round += 1;
    d.phase = 'night';
    d.night = { mafiaTarget: null, doctorTarget: null, detectiveTarget: null, detectiveResult: null };
    return d;
  }
}
