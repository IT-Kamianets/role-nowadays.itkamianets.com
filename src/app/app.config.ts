import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { GameService } from './services/game.service';
import { MockGameService } from './services/mock-game.service';

const USE_MOCK = false; // 👈 змінити на false для реального API

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withFetch()),
    ...(USE_MOCK ? [{ provide: GameService, useClass: MockGameService }] : []),
  ]
};
