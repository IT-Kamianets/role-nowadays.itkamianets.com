import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError(err => {
      if (err.status === 401) {
        const keysToRemove = Object.keys(localStorage).filter(
          k => k.startsWith('isCreator_') || k.startsWith('playerIndex_') || k.startsWith('gameSettings_'),
        );
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.removeItem('token');
        localStorage.removeItem('nickname');
        router.navigate(['/home']);
      }
      return throwError(() => err);
    }),
  );
};
