export interface Game {
  _id: string;
  mode: string;
  creator: string;
  status: 'lobby' | 'running' | 'finished' | 'canceled';
  players: string[];
  maxPlayers: number;
  pass: number;
  data: Record<string, any>;
}
