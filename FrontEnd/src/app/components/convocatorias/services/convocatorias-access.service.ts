/* eslint-disable @angular-eslint/prefer-inject */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User } from 'src/app/domain/models/user.model';
import { Auth } from '../../authentication/auth/auth';
import { environment } from 'src/environments/environment.development';

/**
 * Información de acceso del usuario a convocatorias.
 */
export interface UserConvocatoriaAccess {
  /** ¿El usuario tiene acceso a alguna convocatoria? */
  hasAccess: boolean;
  /** ¿Es administrador global? */
  isAdmin: boolean;
  /** ¿Es colaborador en alguna convocatoria? */
  isCollaborator: boolean;
  /** IDs de convocatorias donde es colaborador */
  convocatoriaIds: number[];
}

/**
 * Servicio para gestionar el acceso del usuario a convocatorias.
 * Proporciona estado reactivo y métodos de consulta.
 */
@Injectable({
  providedIn: 'root',
})
export class ConvocatoriasAccessService {
  // ==================================================================
  // CONFIGURACIÓN
  // ==================================================================

  private readonly API_URL = environment.apiUrl;
  private readonly ENDPOINT = `${this.API_URL}/convocatorias/access-info`;

  // ==================================================================
  // ESTADO REACTIVO
  // ==================================================================

  private accessCache = new BehaviorSubject<UserConvocatoriaAccess | null>(null);
  public readonly access$ = this.accessCache.asObservable();

  // ==================================================================
  // CONSTRUCTOR
  // ==================================================================

  constructor(private http: HttpClient, private authService: Auth) {
    this.initializeAccess();
  }

  // ==================================================================
  // INICIALIZACIÓN
  // ==================================================================

  /**
   * Inicializa el estado de acceso al suscribirse al usuario actual.
   */
  private initializeAccess(): void {
    this.authService.currentUser.subscribe((user) => {
      if (user) {
        this.checkUserConvocatoriaAccess().subscribe({
          next: (access) => this.accessCache.next(access),
          error: () => this.accessCache.next(this.defaultAccess(user)),
        });
      } else {
        this.accessCache.next({
          hasAccess: false,
          isAdmin: false,
          isCollaborator: false,
          convocatoriaIds: [],
        });
      }
    });
  }

  // ==================================================================
  // CONSULTA DE ACCESO
  // ==================================================================

  /**
   * Verifica el acceso del usuario a convocatorias mediante API.
   * @returns Observable con información de acceso
   */
  checkUserConvocatoriaAccess(): Observable<UserConvocatoriaAccess> {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return of(this.defaultAccess(this.authService.getCurrentUser()!));
    }

    const headers = this.getAuthHeaders();

    return this.http.get<UserConvocatoriaAccess>(this.ENDPOINT, { headers }).pipe(
      tap((access) => this.accessCache.next(access)),
      catchError(() => of(this.defaultAccess(this.authService.getCurrentUser()!)))
    );
  }

  // ==================================================================
  // MÉTODOS PRIVADOS
  // ==================================================================

  /**
   * Genera acceso por defecto según rol del usuario.
   * @param user Usuario actual
   */
  private defaultAccess(user: User): UserConvocatoriaAccess {
    return {
      hasAccess: user.role === 'admin',
      isAdmin: user.role === 'admin',
      isCollaborator: false,
      convocatoriaIds: [],
    };
  }

  /**
   * Genera headers con token de autenticación.
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    });
  }

  // ==================================================================
  // MÉTODOS PÚBLICOS DE CONSULTA
  // ==================================================================

  /**
   * Obtiene el acceso actual (síncrono).
   * @returns Acceso actual o null si no está inicializado
   */
  getCurrentAccess(): UserConvocatoriaAccess | null {
    return this.accessCache.value;
  }

  /**
   * Indica si se debe mostrar el enlace a convocatorias en el navbar.
   */
  shouldShowConvocatoriasInNavbar(): boolean {
    return this.accessCache.value?.hasAccess ?? false;
  }

  /**
   * Verifica si el usuario es administrador.
   */
  isAdmin(): boolean {
    return this.accessCache.value?.isAdmin ?? false;
  }

  /**
   * Verifica si el usuario es colaborador en alguna convocatoria.
   */
  isCollaborator(): boolean {
    return this.accessCache.value?.isCollaborator ?? false;
  }

  /**
   * Obtiene los IDs de convocatorias donde el usuario es colaborador.
   */
  getCollaboratorConvocatoriaIds(): number[] {
    return this.accessCache.value?.convocatoriaIds ?? [];
  }
}
