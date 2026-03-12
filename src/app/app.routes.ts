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
  {
    path: 'knight/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/knight/knight').then(m => m.KnightComponent),
  },
  {
    path: 'true-face/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/true-face/true-face').then(m => m.TrueFaceComponent),
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq').then(m => m.FaqComponent),
  },
];
