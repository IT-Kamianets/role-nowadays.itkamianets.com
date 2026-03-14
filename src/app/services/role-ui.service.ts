import { Injectable } from '@angular/core';
import { ClassicMafiaService } from './classic-mafia.service';
import { ExtendedMafiaService } from './extended-mafia.service';
import { RoleConstantsService } from './role-constants.service';

@Injectable({ providedIn: 'root' })
export class RoleUiService {
  constructor(
    private classicMafia: ClassicMafiaService,
    private extendedMafia: ExtendedMafiaService,
    private roleConstants: RoleConstantsService,
  ) {}

  roleDef(role: string) {
    return this.extendedMafia.ROLE_DEFS[role] ?? this.classicMafia.ROLE_DEFS[role] ?? null;
  }

  roleTeamBadgeClass(role: string): string {
    const team = this.roleDef(role)?.team;
    if (team === 'mafia') return 'bg-red-700';
    if (team === 'neutral') return 'bg-purple-700';
    return 'bg-amber-700';
  }

  roleTeamTextClass(role: string): string {
    const team = this.roleDef(role)?.team;
    if (team === 'mafia') return 'text-red-400';
    if (team === 'neutral') return 'text-purple-400';
    return 'text-amber-400';
  }

  roleIcon(role: string): string {
    return this.roleConstants.icon(role);
  }

  roleNameUk(role: string): string {
    return this.roleConstants.nameUk(role);
  }

  revealCardBg(role: string): string {
    const map: Record<string, string> = {
      Mafia:       'bg-gradient-to-br from-red-950 to-rose-950 border-red-600/40',
      Godfather:   'bg-gradient-to-br from-red-950 to-red-950 border-red-800/60',
      Consigliere: 'bg-gradient-to-br from-orange-950 to-red-950 border-orange-600/40',
      Roleblocker: 'bg-gradient-to-br from-orange-950 to-amber-950 border-orange-500/40',
      Poisoner:    'bg-gradient-to-br from-violet-950 to-purple-950 border-violet-600/40',
      Framer:      'bg-gradient-to-br from-rose-950 to-pink-950 border-rose-600/40',
      Detective:   'bg-gradient-to-br from-blue-950 to-indigo-950 border-blue-600/40',
      Doctor:      'bg-gradient-to-br from-green-950 to-emerald-950 border-green-600/40',
      Bodyguard:   'bg-gradient-to-br from-teal-950 to-cyan-950 border-teal-600/40',
      Sheriff:     'bg-gradient-to-br from-yellow-950 to-amber-950 border-yellow-600/40',
      Tracker:     'bg-gradient-to-br from-cyan-950 to-sky-950 border-cyan-600/40',
      Watcher:     'bg-gradient-to-br from-purple-950 to-violet-950 border-purple-600/40',
      Priest:      'bg-gradient-to-br from-slate-800 to-slate-900 border-white/20',
      Mayor:       'bg-gradient-to-br from-amber-950 to-yellow-950 border-amber-600/40',
      Villager:    'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-600/40',
      Jester:      'bg-gradient-to-br from-pink-950 to-fuchsia-950 border-pink-600/40',
      Executioner: 'bg-gradient-to-br from-indigo-950 to-blue-950 border-indigo-600/40',
      Survivor:    'bg-gradient-to-br from-lime-950 to-green-950 border-lime-600/40',
      SerialKiller:'bg-gradient-to-br from-rose-950 to-red-950 border-rose-800/60',
      Arsonist:    'bg-gradient-to-br from-orange-950 to-red-950 border-orange-500/40',
    };
    return map[role] ?? 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-600/40';
  }

  revealGlowColor(role: string): string {
    const map: Record<string, string> = {
      Mafia: 'bg-red-500', Godfather: 'bg-red-700', Consigliere: 'bg-orange-500',
      Roleblocker: 'bg-orange-400', Poisoner: 'bg-violet-500', Framer: 'bg-rose-500',
      Detective: 'bg-blue-500', Doctor: 'bg-green-500', Bodyguard: 'bg-teal-500',
      Sheriff: 'bg-yellow-500', Tracker: 'bg-cyan-500', Watcher: 'bg-purple-500',
      Priest: 'bg-white', Mayor: 'bg-amber-500', Villager: 'bg-slate-400',
      Jester: 'bg-pink-500', Executioner: 'bg-indigo-500', Survivor: 'bg-lime-500',
      SerialKiller: 'bg-rose-700', Arsonist: 'bg-orange-500',
    };
    return map[role] ?? 'bg-white';
  }

  revealBadge(role: string): string {
    const team = this.roleDef(role)?.team;
    if (team === 'mafia')   return 'bg-red-500/20 text-red-300 border-red-500/40';
    if (team === 'neutral') return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }

  roleCardImage(role: string): string {
    const map: Record<string, string> = {
      Villager:    '/card-villager.jpg',
      Detective:   '/card-detective.jpg',
      Doctor:      '/card-doctor.jpg',
      Bodyguard:   '/card-bodyguard.jpg',
      Sheriff:     '/card-sheriff.jpg',
      Tracker:     '/card-tracker.jpg',
      Watcher:     '/card-watcher.jpg',
      Priest:      '/card-priest.jpg',
      Mayor:       '/card-mayor.jpg',
      Mafia:       '/card-mafia.jpg',
      Godfather:   '/card-godfather.jpg',
      Consigliere: '/card-consigliere.jpg',
      Roleblocker: '/card-roleblocker.jpg',
      Poisoner:    '/card-poisoner.jpg',
      Framer:      '/card-framer.jpg',
      Jester:      '/card-jester.jpg',
      Executioner: '/card-executioner.jpg',
      Survivor:    '/card-survivor.jpg',
      SerialKiller: '/card-serialkiller.jpg',
      Arsonist:    '/card-arsonist.jpg',
    };
    return map[role] ?? '/card-back.jpg';
  }

  winnerBannerClass(winner: string | null | undefined): string {
    switch (winner) {
      case 'mafia':        return 'bg-red-950 border-red-800/50';
      case 'jester':       return 'bg-pink-950 border-pink-800/50';
      case 'executioner':  return 'bg-indigo-950 border-indigo-800/50';
      case 'serialkiller': return 'bg-rose-950 border-rose-800/50';
      case 'survivor':     return 'bg-lime-950 border-lime-800/50';
      default:             return 'bg-[#1a110a] border-amber-700/40';
    }
  }

  winnerIcon(winner: string | null | undefined): string {
    const map: Record<string, string> = {
      village: '🛡️', mafia: '🔪', jester: '🤡',
      executioner: '⚖️', serialkiller: '🗡️', survivor: '🏕️',
    };
    return map[winner ?? ''] ?? '🏆';
  }

  winnerLabel(winner: string | null | undefined): string {
    const map: Record<string, string> = {
      village: 'Місто перемогло!', mafia: 'Мафія перемогла!',
      jester: 'Блазень переміг!', executioner: 'Кат переміг!',
      serialkiller: 'Серійний вбивця переміг!', survivor: 'Вижилець переміг!',
    };
    return map[winner ?? ''] ?? 'Гра завершена';
  }

  winnerDescription(winner: string | null | undefined): string {
    const map: Record<string, string> = {
      village: 'Всіх мафіозів знешкоджено.',
      mafia: 'Мафія захопила місто.',
      jester: 'Блазень домігся свого і був виключений.',
      executioner: 'Ціль ката була усунена голосуванням.',
      serialkiller: 'Серійний вбивця залишився єдиним.',
      survivor: 'Вижилець дожив до кінця гри.',
    };
    return map[winner ?? ''] ?? '';
  }

  teamLabel(team: string): string {
    return team === 'mafia' ? 'Мафія' : 'Місто';
  }

  teamAccent(team: string): string {
    return team === 'mafia' ? 'text-red-400' : 'text-amber-400';
  }

  teamBadge(team: string): string {
    return team === 'mafia'
      ? 'bg-red-500/15 text-red-300 border-red-500/30'
      : 'bg-amber-700/15 text-amber-300 border-amber-600/30';
  }

  roleCardBg(team: string): string {
    return team === 'mafia'
      ? 'bg-[#1a0505] border border-red-900/50'
      : 'bg-[#1a110a] border border-[#2d1f10]';
  }
}
