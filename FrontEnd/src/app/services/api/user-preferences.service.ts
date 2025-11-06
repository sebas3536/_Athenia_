/* eslint-disable @angular-eslint/prefer-inject */
// src/app/services/user/user-preferences.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthHeaderService } from './auth-header.service';
import {
  InterfacePreferencesUpdate,
  LanguageEnum,
  NotificationPreferencesUpdate,
  ProfilePhotoResponse,
  ThemeEnum,
  UserPreferencesResponse,
  UserProfileUpdate
} from 'src/app/domain/models/user-preferences.model';
import { UserInfoResponse } from 'src/app/domain/models/user.model';
import { environment } from 'src/environments/environment';

/**
 * Servicio para gestionar preferencias del usuario.
 * Maneja tema, idioma, notificaciones, perfil, foto y convocatorias.
 */
@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  // ==================================================================
  // CONFIGURACIÓN
  // ==================================================================

  private readonly API_URL = `${environment.apiUrl}/preferences`;
  private readonly MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_PHOTO_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  // ==================================================================
  // ESTADO REACTIVO
  // ==================================================================

  private preferencesSubject = new BehaviorSubject<UserPreferencesResponse | null>(null);
  public preferences$ = this.preferencesSubject.asObservable();

  private themeSubject = new BehaviorSubject<ThemeEnum>(ThemeEnum.LIGHT);
  public theme$ = this.themeSubject.asObservable();

  private languageSubject = new BehaviorSubject<LanguageEnum>(LanguageEnum.ES);
  public language$ = this.languageSubject.asObservable();

  // ==================================================================
  // SERVICIOS
  // ==================================================================

  private http = inject(HttpClient);
  private authHeaderService = inject(AuthHeaderService);

  // ==================================================================
  // CONSTRUCTOR
  // ==================================================================

  constructor() {
    this.loadLocalPreferences();
  }

  // ==================================================================
  // CARGA INICIAL
  // ==================================================================

  /** Carga preferencias guardadas en localStorage */
  private loadLocalPreferences(): void {
    const savedTheme = localStorage.getItem('theme') as ThemeEnum | null;
    const savedLanguage = localStorage.getItem('language') as LanguageEnum | null;

    if (savedTheme) {
      this.themeSubject.next(savedTheme);
      this.applyTheme(savedTheme);
    }

    if (savedLanguage) {
      this.languageSubject.next(savedLanguage);
    }
  }

  // ==================================================================
  // OBTENCIÓN DE DATOS
  // ==================================================================

  /**
   * Obtiene todas las preferencias del usuario desde el backend.
   * @returns Preferencias completas
   */
  getUserPreferences(): Observable<UserPreferencesResponse> {
    return this.http.get<UserPreferencesResponse>(this.API_URL, {
      headers: this.authHeaderService.getAuthHeaders()
    }).pipe(
      tap(prefs => {
        this.preferencesSubject.next(prefs);
        if (prefs.theme) this.setTheme(prefs.theme);
        if (prefs.language) this.setLanguage(prefs.language);
      })
    );
  }

  /**
   * Obtiene el estado de la preferencia de convocatorias.
   * @returns Estado de habilitación
   */
  getConvocatoriaPreference(): Observable<{ convocatoria_enabled: boolean }> {
    return this.http.get<{ convocatoria_enabled: boolean }>(`${this.API_URL}/convocatoria`, {
      headers: this.authHeaderService.getAuthHeaders()
    });
  }

  // ==================================================================
  // ACTUALIZACIÓN DE PREFERENCIAS
  // ==================================================================

  /**
   * Actualiza preferencias de notificaciones.
   * @param preferences Nuevas configuraciones
   * @returns Preferencias actualizadas
   */
  updateNotificationPreferences(
    preferences: NotificationPreferencesUpdate
  ): Observable<UserPreferencesResponse> {
    return this.http.patch<UserPreferencesResponse>(
      `${this.API_URL}/notifications`,
      preferences,
      { headers: this.authHeaderService.getAuthHeaders() }
    ).pipe(tap(prefs => this.preferencesSubject.next(prefs)));
  }

  /**
   * Actualiza preferencias de interfaz (tema, idioma).
   * @param preferences Cambios de interfaz
   * @returns Preferencias actualizadas
   */
  updateInterfacePreferences(
    preferences: InterfacePreferencesUpdate
  ): Observable<UserPreferencesResponse> {
    return this.http.patch<UserPreferencesResponse>(
      `${this.API_URL}/interface`,
      preferences,
      { headers: this.authHeaderService.getAuthHeaders() }
    ).pipe(
      tap(prefs => {
        this.preferencesSubject.next(prefs);
        if (preferences.theme) this.setTheme(preferences.theme);
        if (preferences.language) this.setLanguage(preferences.language);
      })
    );
  }

  /**
   * Actualiza datos del perfil del usuario.
   * @param profileData Datos a actualizar
   * @returns Información del usuario actualizada
   */
  updateUserProfile(profileData: UserProfileUpdate): Observable<UserInfoResponse> {
    return this.http.patch<UserInfoResponse>(
      `${this.API_URL}/profile`,
      profileData,
      { headers: this.authHeaderService.getAuthHeaders() }
    );
  }

  /**
   * Habilita o deshabilita el acceso a convocatorias.
   * @param enabled Estado deseado
   * @returns Preferencias actualizadas
   */
  updateConvocatoria(enabled: boolean): Observable<UserPreferencesResponse> {
    return this.http.patch<UserPreferencesResponse>(
      `${this.API_URL}/convocatoria`,
      enabled,
      { headers: this.authHeaderService.getAuthHeaders() }
    );
  }

  // ==================================================================
  // FOTO DE PERFIL
  // ==================================================================

  /**
   * Sube una nueva foto de perfil.
   * @param file Archivo de imagen
   * @returns URL de la nueva foto
   */
  uploadProfilePhoto(file: File): Observable<ProfilePhotoResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ProfilePhotoResponse>(
      `${this.API_URL}/profile/photo`,
      formData,
      { headers: this.authHeaderService.getAuthHeaders() }
    ).pipe(
      tap(response => {
        const current = this.preferencesSubject.value;
        if (current && response.photo_url) {
          this.preferencesSubject.next({
            ...current,
            profile_photo_url: response.photo_url
          });
        }
      })
    );
  }

  /**
   * Elimina la foto de perfil actual.
   * @returns Confirmación del servidor
   */
  deleteProfilePhoto(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_URL}/profile/photo`,
      { headers: this.authHeaderService.getAuthHeaders() }
    ).pipe(
      tap(() => {
        const current = this.preferencesSubject.value;
        if (current) {
          this.preferencesSubject.next({
            ...current,
            profile_photo_url: undefined
          });
        }
      })
    );
  }

  // ==================================================================
  // PRUEBAS
  // ==================================================================

  /**
   * Envía un email de prueba para verificar configuración.
   * @returns Confirmación del envío
   */
  sendTestEmail(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.API_URL}/test-email`,
      {},
      { headers: this.authHeaderService.getAuthHeaders() }
    );
  }

  // ==================================================================
  // TEMA
  // ==================================================================

  /**
   * Cambia el tema de la aplicación.
   * @param theme Nuevo tema
   */
  setTheme(theme: ThemeEnum): void {
    this.themeSubject.next(theme);
    localStorage.setItem('theme', theme);
    this.applyTheme(theme);
  }

  /** Aplica clases CSS al documento según el tema */
  private applyTheme(theme: ThemeEnum): void {
    const root = document.documentElement;
    const effectiveTheme = theme === ThemeEnum.AUTO
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? ThemeEnum.DARK : ThemeEnum.LIGHT)
      : theme;

    root.classList.toggle('dark', effectiveTheme === ThemeEnum.DARK);
  }

  /** Obtiene el tema actualmente activo */
  getCurrentTheme(): ThemeEnum {
    return this.themeSubject.value;
  }

  // ==================================================================
  // IDIOMA
  // ==================================================================

  /**
   * Cambia el idioma de la interfaz.
   * @param language Nuevo idioma
   */
  setLanguage(language: LanguageEnum): void {
    this.languageSubject.next(language);
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }

  /** Obtiene el idioma actualmente activo */
  getCurrentLanguage(): LanguageEnum {
    return this.languageSubject.value;
  }

  // ==================================================================
  // VALIDACIÓN
  // ==================================================================

  /**
   * Valida un archivo de imagen antes de subirlo.
   * @param file Archivo a validar
   * @returns Resultado de la validación
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    if (!this.ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Formato no permitido. Usa JPG, PNG, GIF o WEBP.'
      };
    }

    if (file.size > this.MAX_PHOTO_SIZE) {
      return {
        valid: false,
        error: 'El archivo es demasiado grande. Máximo 5MB.'
      };
    }

    return { valid: true };
  }

  // ==================================================================
  // UTILIDADES
  // ==================================================================

  /**
   * Construye la URL completa de la foto de perfil.
   * @param previewUrl URL temporal (opcional)
   * @returns URL completa o cadena vacía
   */
  getProfilePhotoUrl(previewUrl?: string): string {
    if (previewUrl) return previewUrl;

    const prefs = this.preferencesSubject.value;
    if (!prefs?.profile_photo_url) return '';

    const path = prefs.profile_photo_url.startsWith('/') ? prefs.profile_photo_url : `/${prefs.profile_photo_url}`;
    return `${environment.apiUrl}${path}`;
  }
}