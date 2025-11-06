/* eslint-disable @angular-eslint/prefer-inject */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  User,
  UserCreate,
  Token,
  RefreshTokenRequest,
  LoginStatsResponse,
  UserManagementResponse,
  TwoFASetupResponse,
  TwoFAConfirmRequest,
  UserInfoResponse,
  ChangePasswordRequest,
  AuthStatsSummary,
  ActiveSession,
  RevokeAllResponse,
  SessionStatsResponse
} from '../../domain/models/user.model';
import { AuthHeaderService } from './auth-header.service';
import { environment } from 'src/environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = environment.apiUrl;
  private readonly AUTH_URL = `${this.API_URL}/auth`;
  private readonly SESION = `${this.API_URL}/sessions`;

  constructor(
    private http: HttpClient,
    private authHeaderService: AuthHeaderService
  ) { }

  /** Registers a new user account */
  signup(userData: UserCreate): Observable<Token> {
    return this.http.post<Token>(`${this.AUTH_URL}/signup`, userData);
  }

  /** Logs out the current user by invalidating their token */
  logout(refreshToken: RefreshTokenRequest): Observable<string> {
    return this.http.post<string>(`${this.AUTH_URL}/logout`, refreshToken);
  }

  /** Refreshes access tokens using a valid refresh token */
  refreshToken(refreshToken: RefreshTokenRequest): Observable<Token> {
    return this.http.post<Token>(`${this.AUTH_URL}/refresh`, refreshToken);
  }

  /** Initiates 2FA setup process (generates QR code and secret) */
  setup2FA(): Observable<TwoFASetupResponse> {
    return this.http.post<TwoFASetupResponse>(`${this.AUTH_URL}/2fa/setup`, {}, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  /** Confirms 2FA setup with a verification code */
  confirm2FA(confirmData: TwoFAConfirmRequest): Observable<string> {
    return this.http.post<string>(`${this.AUTH_URL}/2fa/confirm`, confirmData, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  /** Disables 2FA using a verification or backup code */
  disable2FA(disableData: TwoFAConfirmRequest): Observable<string> {
    return this.http.post<string>(`${this.AUTH_URL}/2fa/disable`, disableData, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  /** Gets all users (admin only) */
  getUsers(skip = 0, limit = 100, activeOnly = false): Observable<User[]> {
    return this.http.get<User[]>(`${this.AUTH_URL}/users`, {
      headers: this.authHeaderService.getAuthHeaders(),
      params: { skip, limit, active_only: activeOnly }
    });
  }

  /** Updates user role (admin only) */
  updateUserRole(userId: number, newRole: { new_role: string }): Observable<UserManagementResponse> {
    return this.http.patch<UserManagementResponse>(`${this.AUTH_URL}/users/${userId}/role`, newRole, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  /** Deactivates a user account (admin only) */
  deactivateUser(userId: number): Observable<UserManagementResponse> {
    return this.http.patch<UserManagementResponse>(`${this.AUTH_URL}/users/${userId}/deactivate`, {}, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  /** Activates a user account (admin only) */
  activateUser(userId: number): Observable<UserManagementResponse> {
    return this.http.patch<UserManagementResponse>(`${this.AUTH_URL}/users/${userId}/activate`, {}, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  /** Deletes a user (admin only) */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.AUTH_URL}/${id}`, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  /** Gets login stats for a specific user (admin only) */
  getUserLoginStats(userId: number, hours = 24): Observable<LoginStatsResponse> {
    return this.http.get<LoginStatsResponse>(`${this.AUTH_URL}/users/${userId}/login-stats`, {
      headers: this.authHeaderService.getAuthHeaders(),
      params: { hours }
    });
  }

  /** Gets current user info (profile) */
  getCurrentUser(): Observable<UserInfoResponse> {
    return this.http.get<UserInfoResponse>(`${this.AUTH_URL}/me`, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  /** Changes the current user's password */
  changePassword(passwordData: ChangePasswordRequest): Observable<string> {
    return this.http.patch<string>(`${this.AUTH_URL}/change-password`, passwordData, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  /** Gets current user's login stats */
  getLoginStats(hours = 24): Observable<LoginStatsResponse> {
    return this.http.get<LoginStatsResponse>(`${this.AUTH_URL}/login-stats`, {
      headers: this.authHeaderService.getAuthHeaders(),
      params: { hours }
    });
  }

  /** Checks the health of the authentication service */
  checkHealth(): Observable<string> {
    return this.http.get<string>(`${this.AUTH_URL}/health`);
  }

  /** Gets overall authentication statistics (admin only) */
  getStatsSummary(): Observable<AuthStatsSummary> {
    return this.http.get<AuthStatsSummary>(`${this.AUTH_URL}/stats/summary`, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  loginWith2FA(data: { username: string; password: string; code: string; single_session?: boolean }): Observable<Token> {

    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('username', data.username);
    body.set('password', data.password);
    if (data.single_session !== undefined) {
      body.set('single_session', String(data.single_session));
    }

    const url = `${this.AUTH_URL}/login-with-2fa?totp_code=${encodeURIComponent(data.code)}`;

    return this.http.post<Token>(url, body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }


  /**
   * Obtiene todas las sesiones activas del usuario actual
   */
  getActiveSessions(): Observable<ActiveSession[]> {
    return this.http.get<ActiveSession[]>(`${this.SESION}/active`, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  /**
   * Revoca una sesión específica
   */
  revokeSession(sessionId: number): Observable<{ message: string; session_id: number }> {
    return this.http.delete<{ message: string; session_id: number }>(
      `${this.SESION}/${sessionId}`,
      { headers: this.authHeaderService.getAuthHeaders() }
    );
  }

  /**
   * Revoca todas las sesiones excepto la actual
   */
  revokeAllSessions(exceptCurrent = true): Observable<RevokeAllResponse> {
    return this.http.post<RevokeAllResponse>(
      `${this.SESION}/revoke-all`,
      { except_current: exceptCurrent },
      { headers: this.authHeaderService.getAuthHeaders() }
    );
  }

  /**
   * Obtiene estadísticas de sesiones del usuario
   */
  getSessionStats(): Observable<SessionStatsResponse> {
    return this.http.get<SessionStatsResponse>(`${this.SESION}/stats`, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }
}
