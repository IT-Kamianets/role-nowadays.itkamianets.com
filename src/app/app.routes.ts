import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/create-game/create-game').then(m => m.CreateGameComponent),
  },
  {
    path: 'gameplay',
    loadComponent: () => import('./pages/gameplay/gameplay').then(m => m.GameplayComponent),
  },
];
