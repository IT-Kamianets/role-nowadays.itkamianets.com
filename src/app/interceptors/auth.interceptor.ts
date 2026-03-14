import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

/** Remove all auth-related localStorage keys (exported for unit testing). */
export function clearAuthStorage(): void {
  try {
    const keysToRemove = Object.keys(localStorage).filter(
      k => k.startsWith('isCreator_') || k.startsWith('playerIndex_') || k.startsWith('gameSettings_'),
    );
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('token');
    localStorage.removeItem('nickname');
  } catch { /* Safari private mode / quota exceeded */ }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  let token: string | null = null;
  try { token = localStorage.getItem('token'); } catch { /* Safari private mode */ }

  if (token && req.url.startsWith(environment.apiBase)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError(err => {
      if (err.status === 401) {
        clearAuthStorage();
        router.navigate(['/home']);
      }
      return throwError(() => err);
    }),
  );
};
