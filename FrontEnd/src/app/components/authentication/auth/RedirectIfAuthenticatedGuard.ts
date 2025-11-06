// RedirectIfAuthenticatedGuard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { Auth as AuthService } from './auth';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const redirectIfAuthenticatedGuard: CanActivateFn = (): Observable<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (!authService.isAuthenticated()) {
    return true;
  }

  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    return authService.getUserProfile().pipe(
      map((userProfile) => {
        const defaultRoute = userProfile.role === 'admin' ? '/dashboard' : '/document';
        return router.createUrlTree([defaultRoute]);
      }),
      catchError(() => {
        authService.logout().subscribe();
        return of(true);
      })
    );
  }

  const defaultRoute = currentUser.role === 'admin' ? '/dashboard' : '/document';
  return router.createUrlTree([defaultRoute]);
};
