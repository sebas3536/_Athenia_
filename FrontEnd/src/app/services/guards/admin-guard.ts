/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/guards/role.guard.ts

import { inject } from '@angular/core';
import {
  Router,
  CanActivateFn,
  CanActivateChildFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Auth } from '../../components/authentication/auth/auth';

/**
 * Extrae roles requeridos de la ruta actual o sus ancestros.
 * @param route Ruta actual
 * @returns Lista de roles permitidos
 */
const getRolesFromRoute = (route: ActivatedRouteSnapshot): string[] => {
  // Buscar en ruta actual
  if (route.data['roles'] as string[] | undefined) {
    return route.data['roles'] as string[];
  }

  // Buscar en rutas padre recursivamente
  let parent = route.parent;
  while (parent) {
    if (parent.data['roles'] as string[] | undefined) {
      return parent.data['roles'] as string[];
    }
    parent = parent.parent;
  }

  return [];
};

/**
 * Verifica si el usuario tiene acceso a la ruta según su rol.
 * @param route Ruta solicitada
 * @returns `true` si tiene acceso, `UrlTree` para redirección
 */
const checkRole = (route: ActivatedRouteSnapshot): boolean | UrlTree => {
  const authService = inject(Auth);
  const router = inject(Router);

  const expectedRoles = getRolesFromRoute(route);
  const currentUser = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();
  const routePath = route.routeConfig?.path ?? '';

  // No autenticado → login
  if (!isAuthenticated || !currentUser) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: routePath || undefined }
    });
  }

  // Sin roles requeridos → acceso libre
  if (expectedRoles.length === 0) {
    return true;
  }

  // Tiene rol permitido → acceso
  if (expectedRoles.includes(currentUser.role)) {
    return true;
  }

  // Acceso denegado → redirigir según rol
  const defaultRoute = currentUser.role === 'admin' ? '/dashboard' : '/document';
  return router.createUrlTree([defaultRoute]);
};

/**
 * Guard para `canActivate`.
 * Protege rutas según roles definidos en `data.roles`.
 */
export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot
): boolean | UrlTree => {
  return checkRole(route);
};

/**
 * Guard para `canActivateChild`.
 * Aplica la misma lógica a rutas hijas.
 */
export const roleGuardChild: CanActivateChildFn = (
  childRoute: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot
): boolean | UrlTree => {
  return checkRole(childRoute);
};