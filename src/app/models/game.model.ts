import type { MafiaGameData } from '../services/classic-mafia.service';
import type { KnightGameData } from '../services/knight.service';
import type { TrueFaceGameData } from '../services/true-face.service';

export type GameMode = 'Classic' | 'Extended' | 'Custom' | 'Knight' | 'TrueFace';

export type GameData = MafiaGameData | KnightGameData | TrueFaceGameData;

export interface Player {
  _id: string;
  name: string;
}

export interface Game {
  _id: string;
  mode: GameMode;
  creator: Player;
  status: 'lobby' | 'running' | 'finished' | 'canceled';
  players: Player[];
  maxPlayers: number;
  pass: number;
  data: GameData;
}
