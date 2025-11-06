/* eslint-disable @angular-eslint/prefer-inject */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import {
  User,
  UserCreate,
  Token,
  UserInfoResponse,
  LoginStatsResponse,
  UserManagementResponse,
  UserRole,
  Login2FARequest,
} from '../../../domain/models/user.model';
import { environment } from '../../../../environments/environment.development';
import { Router } from '@angular/router';

/**
 * Servicio central de autenticación y gestión de usuarios.
 * Maneja login, registro, tokens JWT, refresh, 2FA, permisos y operaciones administrativas.
 */
@Injectable({
  providedIn: 'root',
})
export class Auth {
  // ==================== CONFIGURACIÓN Y CONSTANTES ====================
  private readonly API_URL = environment.apiUrl;
  private readonly AUTH_URL = `${this.API_URL}/auth`;
  private readonly TOKEN_KEY = 'authToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';

  // ==================== ESTADO REACTIVO ====================
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public readonly currentUser = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private isRefreshing = false;

  // ==================== CONSTRUCTOR ====================
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  // ==================== INICIALIZACIÓN Y TOKENS ====================

  /**
   * Inicializa el estado de autenticación al cargar el servicio.
   * Verifica tokens en localStorage y restaura sesión si son válidos.
   */
  private initializeAuth(): void {
    const token = this.getToken();
    if (token && !this.isTokenExpired(token)) {
      try {
        const user = this.decodeToken(token);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch {
        this.clearSession();
      }
    } else {
      this.clearSession();
    }
  }

  /**
   * Decodifica un token JWT y extrae la información del usuario.
   * Valida campos requeridos y rol.
   */
  private decodeToken(token: string): User {
    const decoded: any = jwtDecode(token);

    if (!decoded.sub) throw new Error('Token inválido: falta ID de usuario');
    if (!decoded.role) throw new Error('Token inválido: falta rol de usuario');
    if (!decoded.email) throw new Error('Token inválido: falta email');

    if (!this.isValidUserRole(decoded.role)) {
      throw new Error(`Rol inválido: ${decoded.role}`);
    }

    return {
      id: parseInt(decoded.sub, 10),
      name: decoded.name || decoded.email,
      email: decoded.email,
      role: decoded.role,
      is_active: decoded.is_active ?? true,
      two_factor_enabled: decoded.two_factor_enabled || false,
      created_at: decoded.iat
        ? new Date(decoded.iat * 1000).toISOString()
        : new Date().toISOString(),
      last_login: decoded.last_login ?? null,
    };
  }

  /**
   * Verifica si un token JWT ha expirado.
   */
  private isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp ? decoded.exp * 1000 < Date.now() : false;
    } catch {
      return true;
    }
  }

  /**
   * Almacena tokens y actualiza el estado de autenticación.
   */
  private setAuthData(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    const user = this.decodeToken(accessToken);
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Limpia completamente la sesión del usuario.
   * Elimina tokens y datos relacionados del almacenamiento.
   */
  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem('temp_2fa_auth');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('userSession');

    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.isRefreshing = false;
  }

  /**
   * Valida que un string sea un rol de usuario válido.
   */
  private isValidUserRole(role: string): role is UserRole {
    return role === 'admin' || role === 'user';
  }

  // ==================== AUTENTICACIÓN BÁSICA ====================

  /**
   * Inicia sesión con credenciales.
   * Si requiere 2FA, lanza error controlado con flag.
   */
  login(
    email: string,
    password: string,
    enforceSingleSession = true
  ): Observable<Token> {
    const body = new HttpParams()
      .set('username', email)
      .set('password', password)
      .set('single_session', enforceSingleSession.toString());

    return this.http
      .post<Token>(`${this.AUTH_URL}/login`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(
        tap((response) => {
          if (response.requires_2fa) {
            sessionStorage.setItem(
              'temp_2fa_auth',
              JSON.stringify({ email, password })
            );
            throw { requires2FA: true, message: response.message || '2FA requerido' };
          }
          this.clearSession();
          this.setAuthData(response.access_token, response.refresh_token);
        }),
        switchMap((response) => {
          if (response.requires_2fa) return of(response);
          return this.getUserProfile().pipe(
            tap((user) => this.currentUserSubject.next(this.mapUserInfoToUser(user))),
            map(() => response)
          );
        }),
        catchError((error) => {
          if (error?.requires2FA) return throwError(() => error);
          return this.handleError(error);
        })
      );
  }

  /**
   * Inicia sesión con verificación de dos factores (2FA).
   */
  loginWith2FA(loginData: Login2FARequest): Observable<Token> {
    if (!loginData.username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.username.trim())) {
      return throwError(() => new Error('Correo electrónico inválido'));
    }
    if (!loginData.password || loginData.password.length < 8) {
      return throwError(() => new Error('La contraseña debe tener al menos 8 caracteres'));
    }
    if (!loginData.code || !(/^\d{6}$/.test(loginData.code) || /^[A-Z0-9]{8}$/.test(loginData.code))) {
      return throwError(() => new Error('Código de verificación inválido'));
    }

    const body = new HttpParams()
      .set('username', loginData.username)
      .set('password', loginData.password)
      .set('totp_code', loginData.code)
      .set('single_session', (loginData.single_session ?? true).toString());

    return this.http
      .post<Token>(`${this.AUTH_URL}/login-with-2fa`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(
        tap((response) => {
          this.clearSession();
          this.setAuthData(response.access_token, response.refresh_token);
        }),
        switchMap((response) =>
          this.getUserProfile().pipe(
            tap((user) => this.currentUserSubject.next(this.mapUserInfoToUser(user))),
            map(() => response)
          )
        ),
        catchError((error) => {
          if (error instanceof HttpErrorResponse) {
            const detail = error.error?.detail || '';
            if (error.status === 401) {
              if (detail.includes('Código de autenticación inválido')) {
                return throwError(() => new Error('Código de autenticación inválido. Intenta nuevamente.'));
              }
              if (detail.includes('Código expirado')) {
                return throwError(() => new Error('El código ha expirado. Solicita uno nuevo.'));
              }
              if (detail.includes('Cuenta bloqueada')) {
                return throwError(() => new Error('Cuenta bloqueada. Contacta soporte.'));
              }
            }
          }
          return this.handleError(error);
        })
      );
  }

  /**
   * Registra un nuevo usuario.
   */
  signup(userData: UserCreate): Observable<Token> {
    if (!userData.name || userData.name.length < 2) {
      return throwError(() => new Error('El nombre debe tener al menos 2 caracteres'));
    }
    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      return throwError(() => new Error('Correo electrónico inválido'));
    }
    if (!userData.password || userData.password.length < 8) {
      return throwError(() => new Error('La contraseña debe tener al menos 8 caracteres'));
    }
    if (userData.password !== userData.password_confirm) {
      return throwError(() => new Error('Las contraseñas no coinciden'));
    }

    return this.http.post<Token>(`${this.AUTH_URL}/signup`, userData).pipe(
      tap((response) => this.setAuthData(response.access_token, response.refresh_token)),
      switchMap((response) =>
        this.getUserProfile().pipe(
          tap((user) => this.currentUserSubject.next(this.mapUserInfoToUser(user))),
          map(() => response)
        )
      ),
      catchError(this.handleError)
    );
  }

  /**
   * Cierra la sesión del usuario.
   * Intenta notificar al backend y siempre limpia localmente.
   */
  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.clearSession();
      window.location.href = '/login';
      return of({ message: 'Sesión cerrada localmente' });
    }

    return this.http
      .post(
        `${this.AUTH_URL}/logout`,
        { refresh_token: refreshToken },
        { headers: this.getAuthHeaders() }
      )
      .pipe(
        catchError(() => of({ message: 'Sesión cerrada con advertencias' })),
        finalize(() => {
          this.clearSession();
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        })
      );
  }

  /**
   * Refresca el token de acceso usando el refresh token.
   * Evita llamadas simultáneas.
   */
  refreshToken(): Observable<Token> {
    if (this.isRefreshing) {
      return throwError(() => new Error('Actualización de token en progreso'));
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('No hay refresh token disponible'));
    }

    this.isRefreshing = true;

    return this.http
      .post<Token>(`${this.AUTH_URL}/refresh`, { refresh_token: refreshToken })
      .pipe(
        tap((response) => this.setAuthData(response.access_token, response.refresh_token)),
        finalize(() => (this.isRefreshing = false)),
        catchError((error) => {
          this.clearSession();
          return throwError(() => error);
        })
      );
  }

  // ==================== GESTIÓN DE USUARIO ====================

  getUserProfile(): Observable<UserInfoResponse> {
    return this.http
      .get<UserInfoResponse>(`${this.AUTH_URL}/me`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http
      .patch(
        `${this.AUTH_URL}/change-password`,
        { old_password: oldPassword, new_password: newPassword },
        { headers: this.getAuthHeaders() }
      )
      .pipe(catchError(this.handleError));
  }

  getLoginStats(hours = 24): Observable<LoginStatsResponse> {
    const params = new HttpParams().set('hours', hours.toString());
    return this.http
      .get<LoginStatsResponse>(`${this.AUTH_URL}/login-stats`, {
        headers: this.getAuthHeaders(),
        params,
      })
      .pipe(catchError(this.handleError));
  }

  // ==================== ADMINISTRACIÓN ====================

  getAllUsers(skip = 0, limit = 100, activeOnly = true): Observable<UserInfoResponse[]> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString())
      .set('active_only', activeOnly.toString());

    return this.http
      .get<UserInfoResponse[]>(`${this.AUTH_URL}/users`, {
        headers: this.getAuthHeaders(),
        params,
      })
      .pipe(catchError(this.handleError));
  }

  updateUserRole(userId: number, newRole: string): Observable<UserManagementResponse> {
    return this.http
      .patch<UserManagementResponse>(
        `${this.AUTH_URL}/users/${userId}/role`,
        { new_role: newRole },
        { headers: this.getAuthHeaders() }
      )
      .pipe(catchError(this.handleError));
  }

  deactivateUser(userId: number): Observable<UserManagementResponse> {
    return this.http
      .patch<UserManagementResponse>(
        `${this.AUTH_URL}/users/${userId}/deactivate`,
        {},
        { headers: this.getAuthHeaders() }
      )
      .pipe(catchError(this.handleError));
  }

  activateUser(userId: number): Observable<UserManagementResponse> {
    return this.http
      .patch<UserManagementResponse>(
        `${this.AUTH_URL}/users/${userId}/activate`,
        {},
        { headers: this.getAuthHeaders() }
      )
      .pipe(catchError(this.handleError));
  }

  getUserLoginStats(userId: number, hours = 24): Observable<LoginStatsResponse> {
    const params = new HttpParams().set('hours', hours.toString());
    return this.http
      .get<LoginStatsResponse>(`${this.AUTH_URL}/users/${userId}/login-stats`, {
        headers: this.getAuthHeaders(),
        params,
      })
      .pipe(catchError(this.handleError));
  }

  // ==================== MONITOREO Y ESTADÍSTICAS ====================

  healthCheck(): Observable<any> {
    return this.http.get(`${this.AUTH_URL}/health`).pipe(catchError(this.handleError));
  }

  getAuthStatsSummary(): Observable<any> {
    return this.http
      .get(`${this.AUTH_URL}/stats/summary`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  // ==================== UTILIDADES ====================

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.isTokenExpired(token)) {
      this.clearSession();
      return false;
    }

    try {
      const decoded: any = jwtDecode(token);
      return !!decoded.role;
    } catch {
      this.clearSession();
      return false;
    }
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  getCurrentUser(): User | null {
    let user = this.currentUserSubject.value;

    if (!user) {
      const token = this.getToken();
      if (token && !this.isTokenExpired(token)) {
        try {
          user = this.decodeToken(token);
          this.currentUserSubject.next(user);
          return user;
        } catch {
          this.clearSession();
          return null;
        }
      }
      return null;
    }

    return user.role ? user : null;
  }

  /**
   * Maneja errores HTTP de forma centralizada.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido. Por favor, inténtalo de nuevo.';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = error.error?.detail || 'Solicitud inválida';
          break;
        case 401:
          errorMessage = 'Credenciales incorrectas o sesión expirada';
          break;
        case 403:
          errorMessage = error.error?.detail || 'No tienes permisos para realizar esta acción';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado';
          break;
        case 409:
          errorMessage = error.error?.detail || 'El usuario ya existe';
          break;
        case 423:
          errorMessage = error.error?.detail || 'Cuenta bloqueada por múltiples intentos fallidos';
          break;
        case 500:
          errorMessage = 'Error interno del servidor';
          break;
        case 503:
          errorMessage = 'Servicio no disponible';
          break;
        default:
          errorMessage = error.error?.detail || `Error del servidor: ${error.status}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Convierte UserInfoResponse a modelo User.
   */
  private mapUserInfoToUser(user: UserInfoResponse): User {
    if (!this.isValidUserRole(user.role)) {
      throw new Error(`Rol inválido recibido: ${user.role}`);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      two_factor_enabled: user.two_factor_enabled,
      last_login: user.last_login,
      created_at: user.created_at,
    };
  }
}