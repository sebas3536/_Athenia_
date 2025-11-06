/* eslint-disable @angular-eslint/prefer-inject */
// src/app/core/services/password-reset.service.ts

import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

import {
  PasswordResetRequest,
  PasswordResetVerify,
  PasswordResetConfirm,
  PasswordResetResponse,
  TokenValidationResponse
} from 'src/app/domain/models/password-reset.model';

/**
 * Servicio para manejar las operaciones de recuperación y restablecimiento de contraseña.
 * 
 * Incluye validaciones de correo, token, fortaleza de contraseña
 * y conexión directa con los endpoints del backend relacionados
 * con recuperación de contraseñas.
 */
@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {

  /** URL base del endpoint de recuperación de contraseñas */
  private readonly API_URL = `${environment.apiUrl}/password-reset`;

  constructor(private http: HttpClient) {}

  // ==================================================================
  // VALIDACIÓN DE CORREO
  // ==================================================================

  /**
   * Verifica si el correo existe antes de enviar el email de recuperación.
   * @param email Correo electrónico del usuario
   * @returns Observable<boolean> indicando si el correo existe
   */
  checkEmailExists(email: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.API_URL}/check-email?email=${email}`)
      .pipe(map(response => response.exists));
  }

  // ==================================================================
  // SOLICITUD DE RESTABLECIMIENTO
  // ==================================================================

  /**
   * Solicita el envío del email de recuperación de contraseña.
   * @param email Correo electrónico del usuario
   * @returns Observable con la respuesta del servidor
   */
  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    const data: PasswordResetRequest = { email };
    return this.http.post<PasswordResetResponse>(`${this.API_URL}/request`, data);
  }

  // ==================================================================
  // VERIFICACIÓN DE TOKEN
  // ==================================================================

  /**
   * Verifica si el token enviado es válido.
   * @param token Token recibido por correo
   * @returns Observable con el estado del token
   */
  verifyToken(token: string): Observable<TokenValidationResponse> {
    const data: PasswordResetVerify = { token };
    return this.http.post<TokenValidationResponse>(`${this.API_URL}/verify-token`, data);
  }

  // ==================================================================
  // RESTABLECIMIENTO DE CONTRASEÑA
  // ==================================================================

  /**
   * Envía el token y la nueva contraseña para actualizar la cuenta.
   * @param token Token de validación
   * @param newPassword Nueva contraseña
   * @returns Observable con la respuesta del servidor
   */
  resetPassword(token: string, newPassword: string): Observable<PasswordResetResponse> {
    const data: PasswordResetConfirm = { token, new_password: newPassword };
    return this.http.post<PasswordResetResponse>(`${this.API_URL}/reset`, data);
  }

  // ==================================================================
  // VALIDACIONES DE CONTRASEÑA
  // ==================================================================

  /**
   * Valida que la contraseña cumpla con los requisitos mínimos de seguridad.
   * @param password Contraseña a evaluar
   * @returns Objeto con estado de validez y lista de errores
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Al menos una mayúscula');
    if (!/[a-z]/.test(password)) errors.push('Al menos una minúscula');
    if (!/\d/.test(password)) errors.push('Al menos un número');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Al menos un carácter especial');

    return { valid: errors.length === 0, errors };
  }

  // ==================================================================
  // NIVEL DE FORTALEZA
  // ==================================================================

  /**
   * Calcula un nivel general de fortaleza de la contraseña.
   * @param password Contraseña a evaluar
   * @returns 'weak', 'medium' o 'strong'
   */
  getPasswordStrengthLevel(password: string): 'weak' | 'medium' | 'strong' {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    if (strength <= 3) return 'weak';
    if (strength <= 5) return 'medium';
    return 'strong';
  }
}