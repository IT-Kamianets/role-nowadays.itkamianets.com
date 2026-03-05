import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
  },
  {
    path: 'create',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/create-game/create-game').then(m => m.CreateGameComponent),
  },
  {
    path: 'gameplay/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/gameplay/gameplay').then(m => m.GameplayComponent),
  },
];
