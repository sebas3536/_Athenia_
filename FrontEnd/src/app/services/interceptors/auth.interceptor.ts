/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/interceptors/auth.interceptor.ts

import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take, finalize } from 'rxjs/operators';
import { Auth as AuthService } from '../../components/authentication/auth/auth';
import { Router } from '@angular/router';

/**
 * Interceptor HTTP para autenticación automática.
 * - Agrega token JWT a peticiones
 * - Refresca token en 401
 * - Maneja 403 (sin permisos)
 * - Evita múltiples refresh simultáneos
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // ==================================================================
  // ESTADO DE REFRESH
  // ==================================================================

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  // ==================================================================
  // SERVICIOS
  // ==================================================================

  private authService = inject(AuthService);
  private router = inject(Router);

  // ==================================================================
  // ENDPOINTS PÚBLICOS
  // ==================================================================

  private readonly PUBLIC_ENDPOINTS = [
    '/auth/login',
    '/auth/signup',
    '/auth/login-with-2fa',
    '/auth/health'
  ];

  // ==================================================================
  // INTERCEPTOR
  // ==================================================================

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Saltar autenticación para endpoints públicos
    if (this.isPublicEndpoint(req.url)) {
      return next.handle(req);
    }

    const token = this.authService.getToken();
    let authReq = req;

    if (token) {
      authReq = this.addTokenHeader(req, token);
    }

    return next.handle(authReq).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) {
            return this.handle401Error(authReq, next);
          }
          if (error.status === 403) {
            return this.handle403Error(error);
          }
        }
        return throwError(() => error);
      })
    );
  }

  // ==================================================================
  // AUTENTICACIÓN
  // ==================================================================

  /**
   * Agrega el header `Authorization: Bearer <token>`.
   * @param request Petición original
   * @param token Token JWT
   * @returns Petición clonada con header
   */
  private addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      headers: request.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  /**
   * Verifica si la URL pertenece a un endpoint público.
   * @param url URL de la petición
   * @returns `true` si es público
   */
  private isPublicEndpoint(url: string): boolean {
    return this.PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
  }

  // ==================================================================
  // MANEJO DE ERRORES
  // ==================================================================

  /**
   * Maneja errores 401 (token expirado).
   * Intenta refrescar el token y reintenta la petición.
   * @param request Petición fallida
   * @param next Handler HTTP
   * @returns Observable con respuesta o error
   */
  private handle401Error(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (this.isRefreshing) {
      return this.waitForTokenRefresh(request, next);
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.authService.refreshToken().pipe(
      switchMap((token: any) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(token.access_token);
        return next.handle(this.addTokenHeader(request, token.access_token));
      }),
      catchError(err => {
        this.isRefreshing = false;
        this.forceLogout('Token expirado. Por favor, inicia sesión nuevamente.');
        return throwError(() => err);
      }),
      finalize(() => {
        this.isRefreshing = false;
      })
    );
  }

  /**
   * Espera a que termine un refresh en progreso.
   * Evita múltiples llamadas concurrentes al endpoint de refresh.
   * @param request Petición original
   * @param next Handler HTTP
   * @returns Observable con respuesta
   */
  private waitForTokenRefresh(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next.handle(this.addTokenHeader(request, token!)))
    );
  }

  /**
   * Maneja errores 403 (sin permisos).
   * @param error Error HTTP
   * @returns Observable que propaga el error
   */
  private handle403Error(error: HttpErrorResponse): Observable<never> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.role) {
      this.forceLogout('Sesión inválida. Por favor, inicia sesión nuevamente.');
    }
    return throwError(() => error);
  }

  // ==================================================================
  // CIERRE DE SESIÓN
  // ==================================================================

  /**
   * Fuerza el cierre de sesión.
   * Limpia almacenamiento y redirige al login.
   * @param message Mensaje para el usuario
   */
  private forceLogout(message?: string): void {
    this.authService.logout().subscribe({
      complete: () => {
        this.router.navigate(['/login'], {
          queryParams: {
            expired: 'true',
            message: message || 'Sesión expirada'
          },
          replaceUrl: true
        });
      },
      error: () => {
        // Fallback: limpiar localmente y recargar
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      }
    });
  }
}