export type GameMode = 'Classic' | 'Extended' | 'Custom' | 'Knight' | 'TrueFace';

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
  data: Record<string, any>;
}
