import { Injectable } from '@angular/core';
import { Game } from '../models/game.model';
import { Player } from '../models/player.model';
import { Role } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class MockGameService {
  readonly games: Game[] = [
    { id: '1', mode: 'Classic', players: 5, maxPlayers: 10, status: 'waiting', isPrivate: false },
    { id: '2', mode: 'Extended', players: 8, maxPlayers: 12, status: 'waiting', isPrivate: false },
    { id: '3', mode: 'Classic', players: 10, maxPlayers: 10, status: 'in_progress', isPrivate: false },
    { id: '4', mode: 'Custom', players: 3, maxPlayers: 8, status: 'waiting', isPrivate: true },
    { id: '5', mode: 'Extended', players: 6, maxPlayers: 12, status: 'in_progress', isPrivate: false },
  ];

  readonly players: Player[] = [
    { id: '1', name: 'Ви', isAlive: true, role: { name: 'Детектив', team: 'city', description: 'Кожної ночі розслідуйте одного гравця, щоб дізнатись його команду.' } },
    { id: '2', name: 'Аліса', isAlive: true },
    { id: '3', name: 'Боб', isAlive: false },
    { id: '4', name: 'Чарлі', isAlive: true },
    { id: '5', name: 'Діана', isAlive: true },
    { id: '6', name: 'Єва', isAlive: false },
    { id: '7', name: 'Франк', isAlive: true },
    { id: '8', name: 'Грейс', isAlive: true },
  ];

  readonly currentPhase: 'night' | 'day' | 'voting' | 'results' = 'day';

  readonly myRole: Role = {
    name: 'Детектив',
    team: 'city',
    description: 'Кожної ночі розслідуйте одного гравця, щоб дізнатись його команду.',
  };

  readonly chatMessages = [
    { author: 'Аліса', text: 'Доброго ранку, всім!' },
    { author: 'Чарлі', text: 'Боб минулої ночі поводився підозріло...' },
    { author: 'Діана', text: 'Згодна, він точно щось приховує.' },
    { author: 'Франк', text: 'Голосуємо обережно.' },
  ];

  getGamesByMode(mode: string | null): Game[] {
    if (!mode) return this.games;
    return this.games.filter(g => g.mode === mode);
  }
}
