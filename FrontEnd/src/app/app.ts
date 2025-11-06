/* eslint-disable @angular-eslint/prefer-inject */

import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Auth } from './components/authentication/auth/auth';
import { HttpClientModule } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/interceptors/auth.interceptor';
import { AlertContainerComponent } from '@shared/components/alert/alert-container.component';
import { Subject } from 'rxjs';

/**
 * Componente raíz de la aplicación.
 * 
 * Responsabilidades:
 * - Configura el `AuthInterceptor` global para inyectar tokens en todas las peticiones HTTP.
 * - Valida el estado de autenticación en cada cambio de ruta.
 * - Limpia `sessionStorage` al cerrar o recargar la pestaña.
 * - Centraliza la salida de alertas globales.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    AlertContainerComponent
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    private authService: Auth,
    private router: Router
  ) {}

  // ==================== CICLO DE VIDA ====================

  ngOnInit(): void {
    this.setupRouteChangeValidation();
    this.setupSessionCleanup();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== VALIDACIÓN DE AUTENTICACIÓN ====================

  /**
   * Suscribe a eventos de navegación para validar integridad del estado de autenticación.
   * Si el usuario está autenticado pero faltan datos críticos (como `role`), fuerza logout.
   */
  private setupRouteChangeValidation(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.validateAuthState();
      });
  }

  /**
   * Verifica que el estado de autenticación sea válido.
   * Cierra sesión si hay inconsistencias (prevención de sesiones corruptas).
   */
  private validateAuthState(): void {
    if (this.authService.isAuthenticated()) {
      const currentUser = this.authService.getCurrentUser();

      if (!currentUser || !currentUser.role) {
        this.authService.logout().subscribe();
      }
    }
  }

  // ==================== LIMPIEZA DE SESIÓN ====================

  /**
   * Limpia `sessionStorage` al cerrar o recargar la pestaña.
   * Previene fugas de datos sensibles en sesiones compartidas.
   */
  private setupSessionCleanup(): void {
    window.addEventListener('beforeunload', () => {
      sessionStorage.clear();
    });
  }
}