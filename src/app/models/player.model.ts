import { Role } from './role.model';

export interface Player {
  id: string;
  name: string;
  isAlive: boolean;
  role?: Role;
}
