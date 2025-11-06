// auth-guard.ts
import { inject } from '@angular/core';
import { 
  Router, 
  CanActivateFn, 
  CanActivateChildFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot 
} from '@angular/router';
import { Auth as AuthService } from '../../components/authentication/auth/auth';

/**
 * Lógica compartida de verificación de autenticación
 */
const checkAuth = (url: string): boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: url },
      replaceUrl: true
    });
    return false;
  }

  const currentUser = authService.getCurrentUser();
  const pending2FA = sessionStorage.getItem('temp_2fa_auth');

  if (currentUser?.two_factor_enabled && pending2FA && url !== '/twoverification') {
    router.navigate(['/twoverification'], {
      queryParams: { returnUrl: url },
      replaceUrl: true
    });
    return false;
  }

  return true;
};

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean => {
  return checkAuth(state.url);
};

export const authGuardChild: CanActivateChildFn = (
  childRoute: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean => {
  return checkAuth(state.url);
};