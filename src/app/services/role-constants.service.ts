import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RoleConstantsService {
  readonly ROLE_NAMES_UK: Record<string, string> = {
    Villager: 'Житель', Detective: 'Детектив', Doctor: 'Лікар',
    Bodyguard: 'Охоронець', Sheriff: 'Шериф', Tracker: 'Стежник',
    Watcher: 'Спостерігач', Priest: 'Священик', Mayor: 'Мер',
    Mafia: 'Мафія', Godfather: 'Хрещений батько', Consigliere: 'Консільєрі',
    Roleblocker: 'Блокувальник', Poisoner: 'Отруювач', Framer: 'Провокатор',
    Jester: 'Блазень', Executioner: 'Кат', Survivor: 'Вижилець',
    SerialKiller: 'Серійний вбивця', Arsonist: 'Підпалювач',
  };

  readonly ROLE_ICONS: Record<string, string> = {
    Villager: '🏘️', Detective: '🔍', Doctor: '💊', Bodyguard: '🛡️',
    Sheriff: '⭐', Tracker: '👁️', Watcher: '🔭', Priest: '✝️', Mayor: '🎖️',
    Mafia: '🔪', Godfather: '🎭', Consigliere: '📖', Roleblocker: '🚫',
    Poisoner: '☠️', Framer: '🖼️',
    Jester: '🤡', Executioner: '⚖️', Survivor: '🏕️', SerialKiller: '🗡️', Arsonist: '🔥',
  };

  nameUk(role: string): string {
    return this.ROLE_NAMES_UK[role] ?? role;
  }

  icon(role: string): string {
    return this.ROLE_ICONS[role] ?? '❓';
  }
}
