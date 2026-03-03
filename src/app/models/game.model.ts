export interface Game {
  id: string;
  mode: 'Classic' | 'Extended' | 'Custom';
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'in_progress';
  isPrivate: boolean;
}
