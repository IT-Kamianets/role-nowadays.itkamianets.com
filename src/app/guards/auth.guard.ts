import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';

export const authGuard = () => {
  const gameService = inject(GameService);
  const router = inject(Router);
  if (gameService.isAuthenticated() && gameService.getNickname()) return true;
  router.navigate(['/home']);
  return false;
};
