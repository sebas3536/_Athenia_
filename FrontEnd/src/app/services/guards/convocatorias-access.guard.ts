/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Router,
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { inject } from '@angular/core';
import { ConvocatoriasAccessService } from 'src/app/components/convocatorias/services/convocatorias-access.service';

/**
 * Guardia de ruta que protege el acceso al módulo de convocatorias.
 * 
 * - Permite acceso solo si `ConvocatoriasAccessService.shouldShowConvocatoriasInNavbar()` retorna `true`.
 * - En caso contrario, redirige al usuario a `/document`.
 * 
 * Ideal para módulos restringidos por rol, plan o configuración del backend.
 */
export const convocatoriasAccessGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  const accessService = inject(ConvocatoriasAccessService);
  const router = inject(Router);

  // Verifica permiso de acceso al módulo de convocatorias
  const hasAccess = accessService.shouldShowConvocatoriasInNavbar();

  return hasAccess
    ? true
    : router.createUrlTree(['/document']);
};