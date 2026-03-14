import { Injectable } from '@angular/core';
import { ExtendedMafiaService } from './extended-mafia.service';
import type { MafiaGameData } from './classic-mafia.service';

@Injectable({ providedIn: 'root' })
export class NightActionService {
  constructor(private extendedMafia: ExtendedMafiaService) {}

  isSleepingRole(role: string | null): boolean {
    const sleepers = ['Villager', 'Mayor', 'Survivor', 'Jester', 'Executioner'];
    return !!role && sleepers.includes(role);
  }

  hasNightAction(role: string | null): boolean {
    const actors = ['Mafia', 'Godfather', 'Doctor', 'Detective', 'Bodyguard', 'Sheriff',
      'Tracker', 'Watcher', 'Consigliere', 'Roleblocker', 'Poisoner', 'Framer',
      'SerialKiller', 'Arsonist', 'Priest'];
    return !!role && actors.includes(role);
  }

  isMafiaTeamMember(role: string | null): boolean {
    return !!role && this.extendedMafia.ROLE_DEFS[role]?.team === 'mafia';
  }

  roleNightActionLabel(role: string | null): string {
    const map: Record<string, string> = {
      Mafia:       '🔪 Оберіть жертву',
      Godfather:   '🎭 Оберіть жертву (голова мафії)',
      Doctor:      '💊 Оберіть кого захистити',
      Detective:   '🔍 Оберіть кого перевірити',
      Bodyguard:   '🛡️ Оберіть кого охороняти',
      Sheriff:     '⭐ Оберіть кого перевірити',
      Tracker:     '👁️ Оберіть кого відстежити',
      Watcher:     '🔭 Оберіть за ким стежити',
      Consigliere: '📖 Оберіть чию роль дізнатись',
      Roleblocker: '🚫 Оберіть кого заблокувати',
      Poisoner:    '☠️ Оберіть кого отруїти',
      Framer:      '🖼️ Оберіть кого підставити',
      SerialKiller:'🗡️ Оберіть жертву',
      Priest:      '✝️ Оберіть кого освятити цієї ночі',
    };
    return map[role ?? ''] ?? '';
  }

  hasSubmittedNightAction(role: string | null, night: MafiaGameData['night']): boolean {
    if (!role || !night) return false;
    switch (role) {
      case 'Mafia':
      case 'Godfather':    return night.mafiaTarget !== null;
      case 'Doctor':       return night.doctorTarget !== null;
      case 'Detective':    return night.detectiveTarget !== null;
      case 'Bodyguard':    return night.bodyguardTarget !== null && night.bodyguardTarget !== undefined;
      case 'Sheriff':      return night.sheriffTarget !== null && night.sheriffTarget !== undefined;
      case 'Tracker':      return night.trackerTarget !== null && night.trackerTarget !== undefined;
      case 'Watcher':      return night.watcherTarget !== null && night.watcherTarget !== undefined;
      case 'Consigliere':  return night.consigliereTarget !== null && night.consigliereTarget !== undefined;
      case 'Roleblocker':  return night.roleblockerTarget !== null && night.roleblockerTarget !== undefined;
      case 'Poisoner':     return night.poisonerTarget !== null && night.poisonerTarget !== undefined;
      case 'Framer':       return night.framerTarget !== null && night.framerTarget !== undefined;
      case 'SerialKiller': return night.serialKillerTarget !== null && night.serialKillerTarget !== undefined;
      case 'Arsonist':     return (night.arsonistTarget !== null && night.arsonistTarget !== undefined) || !!night.arsonistIgnite;
      case 'Priest':       return night.priestTarget !== null && night.priestTarget !== undefined;
      default:
        console.warn(`NightActionService.hasSubmittedNightAction: unknown role "${role}"`);
        return false;
    }
  }

  myNightTarget(role: string | null, night: MafiaGameData['night']): number | null {
    if (!role || !night) return null;
    switch (role) {
      case 'Mafia':
      case 'Godfather':    return night.mafiaTarget;
      case 'Doctor':       return night.doctorTarget;
      case 'Detective':    return night.detectiveTarget;
      case 'Bodyguard':    return night.bodyguardTarget ?? null;
      case 'Sheriff':      return night.sheriffTarget ?? null;
      case 'Tracker':      return night.trackerTarget ?? null;
      case 'Watcher':      return night.watcherTarget ?? null;
      case 'Consigliere':  return night.consigliereTarget ?? null;
      case 'Roleblocker':  return night.roleblockerTarget ?? null;
      case 'Poisoner':     return night.poisonerTarget ?? null;
      case 'Framer':       return night.framerTarget ?? null;
      case 'SerialKiller': return night.serialKillerTarget ?? null;
      case 'Arsonist':     return night.arsonistTarget ?? null;
      case 'Priest':       return night.priestTarget ?? null;
      default: return null;
    }
  }

  getNightActionLogText(target: number, role: string, playerName: string): string {
    const map: Record<string, string> = {
      Mafia:        `Ви обрали жертву: ${playerName}`,
      Godfather:    `Ви обрали жертву: ${playerName}`,
      Doctor:       `Ви захистили: ${playerName}`,
      Detective:    `Ви перевіряєте: ${playerName}`,
      Bodyguard:    `Ви охороняєте: ${playerName}`,
      Sheriff:      `Ви перевіряєте: ${playerName}`,
      Tracker:      `Ви відстежуєте: ${playerName}`,
      Watcher:      `Ви стежите за: ${playerName}`,
      Consigliere:  `Ви розвідуєте роль: ${playerName}`,
      Roleblocker:  `Ви блокуєте: ${playerName}`,
      Poisoner:     `Ви отруюєте: ${playerName}`,
      Framer:       `Ви підставляєте: ${playerName}`,
      SerialKiller: `Ви обрали жертву: ${playerName}`,
      Priest:       `Ви освятили: ${playerName}`,
    };
    return map[role] ?? `Нічна дія → ${playerName}`;
  }

  roleToField(role: string): string | undefined {
    const map: Record<string, string> = {
      Mafia: 'mafiaTarget', Godfather: 'mafiaTarget',
      Doctor: 'doctorTarget', Detective: 'detectiveTarget',
      Bodyguard: 'bodyguardTarget', Sheriff: 'sheriffTarget',
      Tracker: 'trackerTarget', Watcher: 'watcherTarget',
      Consigliere: 'consigliereTarget', Roleblocker: 'roleblockerTarget',
      Poisoner: 'poisonerTarget', Framer: 'framerTarget',
      SerialKiller: 'serialKillerTarget', Arsonist: 'arsonistTarget', Priest: 'priestTarget',
    };
    return map[role];
  }
}
