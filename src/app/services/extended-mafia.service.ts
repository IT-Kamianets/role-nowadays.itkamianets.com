import { Injectable } from '@angular/core';
import { MafiaGameData } from './classic-mafia.service';

@Injectable({ providedIn: 'root' })
export class ExtendedMafiaService {
  readonly ROLE_DEFS: Record<string, { team: 'city' | 'mafia' | 'neutral'; description: string }> = {
    Villager:    { team: 'city',    description: 'Немає спеціальних здібностей. Голосуй мудро!' },
    Detective:   { team: 'city',    description: 'Вночі перевіряє гравця — мафія чи ні.' },
    Doctor:      { team: 'city',    description: 'Вночі рятує одного гравця від усунення.' },
    Bodyguard:   { team: 'city',    description: 'Вночі захищає ціль. Гине замість цілі від атаки мафії.' },
    Sheriff:     { team: 'city',    description: 'Вночі перевіряє гравця — мафія чи місто.' },
    Tracker:     { team: 'city',    description: 'Відстежує ціль і бачить кого вона відвідала вночі.' },
    Watcher:     { team: 'city',    description: 'Стежить за ціллю і бачить усіх, хто її відвідав.' },
    Priest:      { team: 'city',    description: 'Захищає гравця від маніпуляцій та блокування.' },
    Mayor:       { team: 'city',    description: 'Голос мера рахується вдвічі при голосуванні.' },
    Mafia:       { team: 'mafia',   description: 'Вночі разом з командою обирає жертву для усунення.' },
    Godfather:   { team: 'mafia',   description: 'Голова мафії. Виглядає невинним для детектива.' },
    Consigliere: { team: 'mafia',   description: 'Вночі дізнається точну роль будь-якого гравця.' },
    Roleblocker: { team: 'mafia',   description: 'Вночі блокує нічну дію обраного гравця.' },
    Poisoner:    { team: 'mafia',   description: 'Отруює гравця. Той помирає через 2 раунди.' },
    Framer:      { team: 'mafia',   description: 'Підставляє гравця — детектив бачить його як мафію.' },
    Jester:      { team: 'neutral', description: 'Мета — бути виключеним голосуванням міста.' },
    Executioner: { team: 'neutral', description: 'Має секретну ціль. Перемагає, якщо ціль усунена голосуванням.' },
    Survivor:    { team: 'neutral', description: 'Мета — просто вижити до кінця гри.' },
    SerialKiller: { team: 'neutral', description: 'Вночі вбиває одного гравця. Грає на самоті.' },
    Arsonist:    { team: 'neutral', description: 'Спочатку обливає ціль бензином, потім підпалює всіх.' },
  };

  assignRoles(playerCount: number): string[] {
    let roles: string[];
    if (playerCount <= 5) {
      roles = ['Mafia', 'Detective', 'Doctor', ...Array(Math.max(0, playerCount - 3)).fill('Villager')];
    } else if (playerCount <= 7) {
      roles = ['Mafia', 'Godfather', 'Detective', 'Doctor', 'Bodyguard', ...Array(Math.max(0, playerCount - 5)).fill('Villager')];
    } else if (playerCount <= 9) {
      roles = ['Mafia', 'Mafia', 'Godfather', 'Detective', 'Doctor', 'Bodyguard', 'Jester', ...Array(Math.max(0, playerCount - 7)).fill('Villager')];
    } else if (playerCount <= 11) {
      roles = ['Mafia', 'Mafia', 'Godfather', 'Consigliere', 'Detective', 'Doctor', 'Bodyguard', 'Sheriff', 'Jester', 'Survivor', ...Array(Math.max(0, playerCount - 10)).fill('Villager')];
    } else {
      roles = ['Mafia', 'Mafia', 'Mafia', 'Godfather', 'Consigliere', 'Roleblocker', 'Detective', 'Doctor', 'Bodyguard', 'Sheriff', 'Tracker', 'Jester', 'Survivor', ...Array(Math.max(0, playerCount - 13)).fill('Villager')];
    }
    return this.shuffle(roles);
  }

  assignRolesCustom(roleCounts: Record<string, number>): string[] {
    const roles: string[] = [];
    for (const [role, count] of Object.entries(roleCounts)) {
      for (let i = 0; i < count; i++) roles.push(role);
    }
    return this.shuffle(roles);
  }

  private shuffle(arr: string[]): string[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  initGameData(
    playerCount: number,
    settings?: { dayDuration: number; nightDuration: number; votingDuration: number },
    customRoles?: Record<string, number>,
  ): MafiaGameData {
    const rolesArr = customRoles ? this.assignRolesCustom(customRoles) : this.assignRoles(playerCount);
    const roles: Record<string, string> = {};
    rolesArr.forEach((r, i) => { roles[String(i)] = r; });

    const executionerTargets: Record<string, number> = {};
    const execIndices: number[] = [];
    const nonExecIndices: number[] = [];
    rolesArr.forEach((r, i) => {
      if (r === 'Executioner') execIndices.push(i);
      else nonExecIndices.push(i);
    });
    for (const execIdx of execIndices) {
      const pool = nonExecIndices.filter(i => i !== execIdx);
      if (pool.length) executionerTargets[String(execIdx)] = pool[Math.floor(Math.random() * pool.length)];
    }

    return {
      phase: 'night',
      round: 1,
      roles,
      alive: Array.from({ length: playerCount }, (_, i) => i),
      night: {
        mafiaTarget: null, doctorTarget: null, detectiveTarget: null, detectiveResult: null,
        bodyguardTarget: null, sheriffTarget: null, sheriffResult: null,
        trackerTarget: null, trackerResult: null,
        watcherTarget: null, watcherResult: null,
        consigliereTarget: null, consigliereResult: null,
        roleblockerTarget: null, poisonerTarget: null, framerTarget: null,
        serialKillerTarget: null, arsonistTarget: null, arsonistIgnite: false,
      },
      eliminated: null,
      winner: null,
      log: ['Гра розпочалась! Настала перша ніч.'],
      votes: {},
      phaseStartedAt: Date.now(),
      dayMessages: [],
      nightMessages: [],
      settings: settings ?? { dayDuration: 60, nightDuration: 30, votingDuration: 30 },
      poisoned: [],
      arsonistDoused: [],
      executionerTargets,
    };
  }

  resolveNight(data: MafiaGameData): { data: MafiaGameData; message: string } {
    const d: MafiaGameData = JSON.parse(JSON.stringify(data));
    const night = d.night;
    const roles = d.roles;

    // 1. Roleblocker: build blocked set
    const blocked = new Set<number>();
    if (night.roleblockerTarget !== null && night.roleblockerTarget !== undefined) {
      blocked.add(night.roleblockerTarget);
    }

    // 2. Framer
    const framerIdx = d.alive.find(i => roles[String(i)] === 'Framer');
    const framedPlayers = new Set<number>();
    if (framerIdx !== undefined && !blocked.has(framerIdx) &&
        night.framerTarget !== null && night.framerTarget !== undefined) {
      framedPlayers.add(night.framerTarget);
    }

    const findByRole = (role: string) => d.alive.find(i => roles[String(i)] === role);
    const isBlocked = (idx: number | undefined) => idx !== undefined && blocked.has(idx);

    const doctorIdx   = findByRole('Doctor');
    const bodyguardIdx = findByRole('Bodyguard');
    const detectiveIdx = findByRole('Detective');
    const sheriffIdx   = findByRole('Sheriff');
    const trackerIdx   = findByRole('Tracker');
    const watcherIdx   = findByRole('Watcher');
    const consigliereIdx = findByRole('Consigliere');
    const skIdx        = findByRole('SerialKiller');
    const arsonistIdx  = findByRole('Arsonist');
    const poisonerIdx  = findByRole('Poisoner');

    // 3. Detective result
    if (!isBlocked(detectiveIdx) && night.detectiveTarget !== null && night.detectiveTarget !== undefined) {
      const tRole = roles[String(night.detectiveTarget)];
      if (framedPlayers.has(night.detectiveTarget)) {
        d.night.detectiveResult = 'mafia';
      } else if (tRole === 'Godfather') {
        d.night.detectiveResult = 'village';
      } else {
        d.night.detectiveResult = this.ROLE_DEFS[tRole]?.team === 'mafia' ? 'mafia' : 'village';
      }
    }

    // 4. Sheriff result
    if (!isBlocked(sheriffIdx) && night.sheriffTarget !== null && night.sheriffTarget !== undefined) {
      const tRole = roles[String(night.sheriffTarget)];
      if (framedPlayers.has(night.sheriffTarget)) {
        d.night.sheriffResult = 'mafia';
      } else if (tRole === 'Godfather') {
        d.night.sheriffResult = 'city';
      } else {
        d.night.sheriffResult = this.ROLE_DEFS[tRole]?.team === 'mafia' ? 'mafia' : 'city';
      }
    }

    // 5. Consigliere result
    if (!isBlocked(consigliereIdx) && night.consigliereTarget !== null && night.consigliereTarget !== undefined) {
      d.night.consigliereResult = roles[String(night.consigliereTarget)] ?? null;
    }

    // 6. Tracker: who did the target visit?
    if (!isBlocked(trackerIdx) && night.trackerTarget !== null && night.trackerTarget !== undefined) {
      const tRole = roles[String(night.trackerTarget)];
      let visited: number | null = null;
      if (tRole === 'Mafia' || tRole === 'Godfather') visited = night.mafiaTarget ?? null;
      else if (tRole === 'Doctor') visited = night.doctorTarget ?? null;
      else if (tRole === 'Detective') visited = night.detectiveTarget ?? null;
      else if (tRole === 'Sheriff') visited = night.sheriffTarget ?? null;
      else if (tRole === 'Bodyguard') visited = night.bodyguardTarget ?? null;
      else if (tRole === 'Consigliere') visited = night.consigliereTarget ?? null;
      else if (tRole === 'Roleblocker') visited = night.roleblockerTarget ?? null;
      else if (tRole === 'Poisoner') visited = night.poisonerTarget ?? null;
      else if (tRole === 'Framer') visited = night.framerTarget ?? null;
      else if (tRole === 'SerialKiller') visited = night.serialKillerTarget ?? null;
      else if (tRole === 'Arsonist') visited = night.arsonistTarget ?? null;
      d.night.trackerResult = visited;
    }

    // 7. Watcher: who visited the target?
    if (!isBlocked(watcherIdx) && night.watcherTarget !== null && night.watcherTarget !== undefined) {
      const wt = night.watcherTarget;
      const visitors: number[] = [];
      if (night.mafiaTarget === wt) {
        const mv = d.alive.find(i => roles[String(i)] === 'Mafia' || roles[String(i)] === 'Godfather');
        if (mv !== undefined) visitors.push(mv);
      }
      if (!isBlocked(doctorIdx) && night.doctorTarget === wt && doctorIdx !== undefined) visitors.push(doctorIdx);
      if (!isBlocked(detectiveIdx) && night.detectiveTarget === wt && detectiveIdx !== undefined) visitors.push(detectiveIdx);
      if (!isBlocked(sheriffIdx) && night.sheriffTarget === wt && sheriffIdx !== undefined) visitors.push(sheriffIdx);
      if (!isBlocked(bodyguardIdx) && night.bodyguardTarget === wt && bodyguardIdx !== undefined) visitors.push(bodyguardIdx);
      if (night.roleblockerTarget === wt) {
        const rbIdx = findByRole('Roleblocker');
        if (rbIdx !== undefined) visitors.push(rbIdx);
      }
      if (!isBlocked(skIdx) && night.serialKillerTarget === wt && skIdx !== undefined) visitors.push(skIdx);
      d.night.watcherResult = visitors;
    }

    // 8. Poisoner
    if (!isBlocked(poisonerIdx) && night.poisonerTarget !== null && night.poisonerTarget !== undefined) {
      if (!d.poisoned) d.poisoned = [];
      if (!d.poisoned.find(p => p.player === night.poisonerTarget)) {
        d.poisoned.push({ player: night.poisonerTarget!, round: d.round });
      }
    }

    // 9. Arsonist douse (ignite handled in kills below)
    if (!d.arsonistDoused) d.arsonistDoused = [];
    if (!isBlocked(arsonistIdx) && !night.arsonistIgnite &&
        night.arsonistTarget !== null && night.arsonistTarget !== undefined) {
      if (!d.arsonistDoused.includes(night.arsonistTarget)) {
        d.arsonistDoused.push(night.arsonistTarget);
      }
    }

    // 10. Compute kills
    const killed: number[] = [];

    // Mafia kill
    const mafiaTarget = night.mafiaTarget;
    if (mafiaTarget !== null && mafiaTarget !== undefined) {
      const doctorSaved  = !isBlocked(doctorIdx) && night.doctorTarget === mafiaTarget;
      const bgProtects   = !isBlocked(bodyguardIdx) && night.bodyguardTarget === mafiaTarget;
      if (doctorSaved) {
        d.log.push(`Раунд ${d.round}: Лікар врятував гравця ${mafiaTarget + 1}.`);
      } else if (bgProtects && bodyguardIdx !== undefined) {
        killed.push(bodyguardIdx);
        d.log.push(`Раунд ${d.round}: Охоронець (гравець ${bodyguardIdx + 1}) загинув, захищаючи гравця ${mafiaTarget + 1}.`);
      } else {
        killed.push(mafiaTarget);
      }
    }

    // Serial Killer kill
    if (!isBlocked(skIdx) && night.serialKillerTarget !== null && night.serialKillerTarget !== undefined) {
      const skTarget = night.serialKillerTarget;
      if (!killed.includes(skTarget)) {
        const doctorSaved = !isBlocked(doctorIdx) && night.doctorTarget === skTarget;
        if (doctorSaved) {
          d.log.push(`Раунд ${d.round}: Лікар врятував гравця ${skTarget + 1} від серійного вбивці.`);
        } else {
          killed.push(skTarget);
        }
      }
    }

    // Arsonist ignite
    if (!isBlocked(arsonistIdx) && night.arsonistIgnite && d.arsonistDoused?.length) {
      for (const p of d.arsonistDoused) {
        if (d.alive.includes(p) && !killed.includes(p)) killed.push(p);
      }
      d.arsonistDoused = [];
    }

    // Poison deaths (round >= appliedRound + 2)
    if (d.poisoned) {
      for (const p of d.poisoned) {
        if (d.round >= p.round + 2 && d.alive.includes(p.player) && !killed.includes(p.player)) {
          killed.push(p.player);
          d.log.push(`Раунд ${d.round}: Гравець ${p.player + 1} помер від отрути.`);
        }
      }
      d.poisoned = d.poisoned.filter(p => d.round < p.round + 2);
    }

    // Apply deaths
    for (const k of killed) {
      if (d.alive.includes(k)) {
        d.alive = d.alive.filter(i => i !== k);
        if (!d.log.some(l => l.includes(`Гравець ${k + 1}`) && (l.includes('загинув') || l.includes('згорів') || l.includes('помер')))) {
          d.log.push(`Раунд ${d.round}: Гравець ${k + 1} (${roles[String(k)]}) загинув вночі.`);
        }
      }
    }

    d.eliminated = killed.length > 0 ? killed[0] : null;
    if (killed.length === 0) d.log.push(`Раунд ${d.round}: Ніхто не загинув.`);

    d.phase = 'day';
    const message = killed.length > 0
      ? killed.map(k => `Гравець ${k + 1} загинув вночі.`).join(' ')
      : 'Ніхто не загинув цієї ночі.';
    return { data: d, message };
  }

  checkWin(data: MafiaGameData): MafiaGameData['winner'] {
    if (data.winner) return data.winner;
    const aliveRoles = data.alive.map(i => data.roles[String(i)]);
    const mafiaCount   = aliveRoles.filter(r => this.ROLE_DEFS[r]?.team === 'mafia').length;
    const cityCount    = aliveRoles.filter(r => this.ROLE_DEFS[r]?.team === 'city').length;
    const skCount      = aliveRoles.filter(r => r === 'SerialKiller').length;
    const neutralCount = aliveRoles.filter(r => this.ROLE_DEFS[r]?.team === 'neutral' && r !== 'SerialKiller').length;
    if (mafiaCount === 0 && skCount === 0) return 'village';
    if (skCount > 0 && mafiaCount === 0 && cityCount === 0 && neutralCount === 0) return 'serialkiller';
    if (mafiaCount >= cityCount + skCount + neutralCount) return 'mafia';
    return null;
  }

  resolveVoting(data: MafiaGameData, eliminatedIndex: number): MafiaGameData {
    const d: MafiaGameData = JSON.parse(JSON.stringify(data));
    d.eliminated = eliminatedIndex;
    d.alive = d.alive.filter(i => i !== eliminatedIndex);
    const role = d.roles[String(eliminatedIndex)];
    d.log.push(`Раунд ${d.round}: Гравець ${eliminatedIndex + 1} (${role}) усунений голосуванням.`);

    if (role === 'Jester') {
      d.winner = 'jester';
      d.phase = 'finished';
      return d;
    }

    if (d.executionerTargets) {
      for (const [, targetIdx] of Object.entries(d.executionerTargets)) {
        if (targetIdx === eliminatedIndex) {
          d.winner = 'executioner';
          d.phase = 'finished';
          return d;
        }
      }
    }

    d.round += 1;
    d.phase = 'night';
    d.night = {
      mafiaTarget: null, doctorTarget: null, detectiveTarget: null, detectiveResult: null,
      bodyguardTarget: null, sheriffTarget: null, sheriffResult: null,
      trackerTarget: null, trackerResult: null,
      watcherTarget: null, watcherResult: null,
      consigliereTarget: null, consigliereResult: null,
      roleblockerTarget: null, poisonerTarget: null, framerTarget: null,
      serialKillerTarget: null, arsonistTarget: null, arsonistIgnite: false,
    };
    return d;
  }
}
