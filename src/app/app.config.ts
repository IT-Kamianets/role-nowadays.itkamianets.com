import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { GameService } from './services/game.service';
import { MockGameService } from './services/mock-game.service';

const USE_MOCK = false; // змінити на true для mock-режиму

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    ...(USE_MOCK ? [{ provide: GameService, useClass: MockGameService }] : []),
  ]
};
