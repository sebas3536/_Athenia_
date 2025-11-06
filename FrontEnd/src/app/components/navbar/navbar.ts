// src/app/layout/components/navbar/navbar.component.ts
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { Auth } from '../../components/authentication/auth/auth';
import { User } from '../../domain/models/user.model';
import { AlertService } from '@shared/components/alert/alert.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ConvocatoriasAccessService } from '../convocatorias/services/convocatorias-access.service';

/**
 * Item de navegación en la barra lateral.
 */
interface NavItem {
  id: string;
  icon: string;
  label: string;
  route: string;
  roles: string[];
}

/**
 * Barra de navegación lateral con acceso dinámico según rol y permisos.
 * Soporta navegación, logout y resaltado de ruta activa.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    LucideAngularModule
  ],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar implements OnInit, OnDestroy {
  // ==================================================================
  // ESTADO
  // ==================================================================

  user: User | null = null;
  activeItem = '';
  isLoggingOut = false;
  visibleNavItems: NavItem[] = [];

  // ==================================================================
  // SUSCRIPCIONES
  // ==================================================================

  private userSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private accessSubscription?: Subscription;

  // ==================================================================
  // SERVICIOS
  // ==================================================================

  private router = inject(Router);
  private authService = inject(Auth);
  private alertService = inject(AlertService);
  private convocatoriasAccessService = inject(ConvocatoriasAccessService);

  // ==================================================================
  // ITEMS DE NAVEGACIÓN
  // ==================================================================

  private readonly BASE_NAV_ITEMS: NavItem[] = [
    { id: 'document', icon: 'Folder', label: 'Documentos', route: '/document', roles: ['user', 'admin'] },
    { id: 'search', icon: 'Search', label: 'Búsqueda', route: '/search', roles: ['user', 'admin'] },
    { id: 'settings', icon: 'Settings', label: 'Configuración', route: '/settings', roles: ['user', 'admin'] },
    { id: 'security', icon: 'Shield', label: 'Seguridad', route: '/security', roles: ['user', 'admin'] },
    { id: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard', route: '/dashboard', roles: ['admin'] },
    { id: 'users', icon: 'Users', label: 'Usuarios', route: '/users', roles: ['admin'] },
    { id: 'history', icon: 'History', label: 'Historial', route: '/history', roles: ['admin'] }
  ];

  private readonly CONVOCATORIAS_ITEM: NavItem = {
    id: 'applications',
    icon: 'FolderOpen',
    label: 'Convocatorias',
    route: '/applications',
    roles: ['admin']
  };

  // ==================================================================
  // CICLO DE VIDA
  // ==================================================================

  ngOnInit(): void {
    this.subscribeToUser();
    this.subscribeToConvocatoriasAccess();
    this.subscribeToRouteChanges();
    this.handleRootRoute();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
    this.accessSubscription?.unsubscribe();
  }

  // ==================================================================
  // SUSCRIPCIONES
  // ==================================================================

  /** Suscribe al usuario actual */
  private subscribeToUser(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.user = user;
      this.updateVisibleNavItems();
    });
  }

  /** Suscribe a cambios en acceso a convocatorias */
  private subscribeToConvocatoriasAccess(): void {
    this.accessSubscription = this.convocatoriasAccessService.access$.subscribe(() => {
      this.updateVisibleNavItems();
    });
  }

  /** Suscribe a cambios de ruta para resaltar item activo */
  private subscribeToRouteChanges(): void {
    this.updateActiveItem(this.router.url);

    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateActiveItem(event.urlAfterRedirects);
      });
  }

  /** Redirige desde raíz según rol */
  private handleRootRoute(): void {
    if (this.router.url === '/' || this.router.url === '') {
      this.redirectToDefaultRoute();
    }
  }

  // ==================================================================
  // NAVEGACIÓN
  // ==================================================================

  /**
   * Actualiza items visibles según rol y acceso a convocatorias.
   */
  private updateVisibleNavItems(): void {
    if (!this.user) {
      this.visibleNavItems = [];
      return;
    }

    const items = this.BASE_NAV_ITEMS.filter(item =>
      item.roles.includes(this.user!.role)
    );

    if (this.convocatoriasAccessService.shouldShowConvocatoriasInNavbar()) {
      items.push(this.CONVOCATORIAS_ITEM);
    }

    this.visibleNavItems = items;
  }

  /**
   * Navega a una ruta y marca como activa.
   * @param itemId ID del item de navegación
   */
  setActive(itemId: string): void {
    const navItem = this.visibleNavItems.find(ni => ni.id === itemId);
    if (!navItem) return;

    this.activeItem = itemId;
    this.router.navigate([navItem.route]);
  }

  /** Actualiza el item activo según la URL actual */
  private updateActiveItem(url: string): void {
    const firstSegment = url.split('/')[1] || '';
    const matchedItem = this.visibleNavItems.find(item =>
      item.route === `/${firstSegment}` || item.id === firstSegment
    );

    this.activeItem = matchedItem?.id || (this.visibleNavItems[0]?.id ?? '');
  }

  /** Redirige a ruta por defecto según rol */
  private redirectToDefaultRoute(): void {
    if (!this.user) return;
    const defaultRoute = this.user.role === 'admin' ? '/dashboard' : '/document';
    this.router.navigate([defaultRoute]);
  }

  // ==================================================================
  // LOGOUT
  // ==================================================================

  /** Cierra sesión del usuario */
  logout(): void {
    this.isLoggingOut = true;

    this.authService.logout().subscribe({
      next: (response) => this.handleLogoutSuccess(response.message || 'Sesión cerrada correctamente'),
      error: (err) => this.handleLogoutError(err),
      complete: () => this.isLoggingOut = false
    });
  }

  /** Maneja éxito en logout */
  private handleLogoutSuccess(message: string): void {
    this.alertService.success('Sesión cerrada', message, 2000);
    setTimeout(() => this.router.navigate(['/']), 500);
  }

  /** Maneja error en logout */
  private handleLogoutError(err: unknown): void {
    let title = 'Algo salió mal';
    if (err instanceof HttpErrorResponse) {
      switch (err.status) {
        case 401: title = 'Sesión expirada'; break;
        case 404: title = 'Servicio no disponible'; break;
        default: title = 'Error desconocido';
      }
    }

    this.alertService.show({
      title,
      description: '',
      type: 'info',
      appearance: 'fill',
      duration: 3000
    });

    setTimeout(() => this.router.navigate(['/']), 500);
  }
}