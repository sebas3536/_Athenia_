/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @angular-eslint/prefer-inject */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from "lucide-angular";
import { Subject, takeUntil } from 'rxjs';
import { TwoFactorSetupDialog } from "./two-factor-setup-dialog/two-factor-setup-dialog";
import { ZardSwitchComponent } from "@shared/components/switch/switch.component";
import { UserPreferencesService } from 'src/app/services/api/user-preferences.service';
import { UserService } from 'src/app/services/api/user-service';
import { AlertService } from '@shared/components/alert/alert.service';
import { ActiveSession } from 'src/app/domain/models/user.model';

/**
 * Componente de configuración de seguridad
 * Gestiona el cambio de contraseña, autenticación de dos factores (2FA),
 * preferencias de notificaciones y administración de sesiones activas
 */
@Component({
  selector: 'app-security',
  imports: [
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    TwoFactorSetupDialog,
    ZardSwitchComponent
  ],
  templateUrl: './security.html',
  styleUrls: ['./security.css']
})
export class Security implements OnInit, OnDestroy {

  // ==================== PROPIEDADES PRIVADAS ====================

  /** Subject para gestionar la limpieza de subscripciones */
  private destroy$ = new Subject<void>();

  // ==================== PROPIEDADES DE CAMBIO DE CONTRASEÑA ====================

  /** Contraseña actual del usuario */
  currentPassword = '';

  /** Nueva contraseña deseada */
  newPassword = '';

  /** Confirmación de la nueva contraseña */
  confirmPassword = '';

  /** Mensaje de error relacionado con el cambio de contraseña */
  passwordError = '';

  // ==================== PROPIEDADES DE CONFIGURACIÓN DE SEGURIDAD ====================

  /** Indica si la autenticación de dos factores está habilitada */
  twoFactorEnabled = false;

  /** Indica si las notificaciones por email están activas */
  emailNotifications = true;

  /** Indica si las alertas de inicio de sesión están activas */
  loginAlerts = true;

  /** Controla la visibilidad del diálogo de configuración 2FA */
  showSetupDialog = false;

  // ==================== PROPIEDADES DE SESIONES ACTIVAS ====================

  /** Lista de sesiones activas del usuario */
  activeSessions: ActiveSession[] = [];

  /** Indica si se están cargando las sesiones activas */
  isLoadingSessions = false;

  // ==================== CONSTRUCTOR ====================

  constructor(
    private userService: UserService,
    private preferencesService: UserPreferencesService,
    private alertService: AlertService
  ) { }

  // ==================== HOOKS DEL CICLO DE VIDA ====================

  /**
   * Inicialización del componente
   * Carga preferencias y sesiones activas del usuario
   */
  ngOnInit(): void {
    this.loadPreferences();
    this.loadActiveSessions();
  }

  /**
   * Limpieza al destruir el componente
   * Completa todas las subscripciones activas
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== MÉTODOS DE CARGA DE DATOS ====================

  /**
   * Carga las preferencias de seguridad del usuario
   * Incluye notificaciones por email, alertas de login y estado de 2FA
   */
  loadPreferences(): void {
    this.preferencesService.getUserPreferences()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prefs) => {
          this.emailNotifications = prefs.email_notifications;
          this.loginAlerts = prefs.login_alerts ?? true;
        },
        error: () => {
          this.alertService.error('Error al cargar preferencias', '', 3000);
        }
      });

    this.check2FAStatus();
  }

  /**
   * Verifica el estado actual de la autenticación de dos factores
   * Actualiza la propiedad twoFactorEnabled según la respuesta del servidor
   */
  check2FAStatus(): void {
    this.userService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: any) => {
          this.twoFactorEnabled = user.two_factor_enabled ?? false;
        },
        error: () => {
          this.alertService.error('No se pudo verificar el estado del 2FA', '', 3000);
        }
      });
  }

  /**
   * Carga la lista de sesiones activas del usuario actual
   * Muestra un indicador de carga mientras se obtienen los datos
   */
  loadActiveSessions(): void {
    this.isLoadingSessions = true;

    this.userService.getActiveSessions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sessions) => {
          this.activeSessions = sessions;
          this.isLoadingSessions = false;
        },
        error: () => {
          this.isLoadingSessions = false;
          this.alertService.error('Error al cargar sesiones activas', '', 3000);
        }
      });
  }

  // ==================== MÉTODOS DE CAMBIO DE CONTRASEÑA ====================

  /**
   * Procesa el cambio de contraseña del usuario
   * Valida los campos, verifica coincidencia y envía la solicitud al servidor
   * @param event - Evento del formulario para prevenir comportamiento por defecto
   */
  handleChangePassword(event: Event): void {
    event.preventDefault();
    this.passwordError = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.alertService.error('Por favor completa todos los campos', '', 3000);
      return;
    }

    if (this.newPassword.length < 6) {
      this.alertService.error('La nueva contraseña debe tener al menos 6 caracteres', '', 3000);
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.alertService.error('Las contraseñas no coinciden', '', 3000);
      return;
    }

    this.userService.changePassword({
      old_password: this.currentPassword,
      new_password: this.newPassword,
      confirm_password: this.confirmPassword
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertService.success('Contraseña actualizada exitosamente', '', 3000);
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.passwordError = '';
        },
        error: (error) => {
          const message = error.error?.detail || 'Error al actualizar contraseña';
          this.passwordError = message;
          this.alertService.error(message, '', 4000);
        }
      });
  }

  // ==================== MÉTODOS DE AUTENTICACIÓN DE DOS FACTORES ====================

  /**
   * Maneja la activación o desactivación del 2FA
   * Si se activa, muestra el diálogo de configuración
   * Si se desactiva, solicita confirmación y código de verificación
   * @param enabled - Estado deseado del 2FA (true para activar, false para desactivar)
   */
  async handleToggleTwoFactor(enabled: boolean): Promise<void> {
    if (enabled) {
      this.showSetupDialog = true;
      this.twoFactorEnabled = false;
    } else {
      const confirmed = await this.alertService.confirm(
        'Desactivar autenticación en dos pasos',
        '¿Seguro que deseas desactivar el 2FA?'
      );

      if (!confirmed) {
        this.twoFactorEnabled = true;
        return;
      }

      const code = prompt('Introduce tu código de autenticación (TOTP o respaldo):');
      if (!code || code.trim().length < 6) {
        this.alertService.error('Código inválido o cancelado', '', 3000);
        this.twoFactorEnabled = true;
        return;
      }

      try {
        await this.userService.disable2FA({ code }).toPromise();
        this.twoFactorEnabled = false;
        this.alertService.info('2FA desactivado correctamente', '', 3000);
      } catch (error: any) {
        const message = error?.error?.detail || 'Error desactivando 2FA';
        this.alertService.error(message, '', 4000);
        this.twoFactorEnabled = true;
      }
    }
  }

  /**
   * Callback ejecutado al completar exitosamente la configuración de 2FA
   * Actualiza el estado y cierra el diálogo de configuración
   */
  handleSetupComplete(): void {
    this.twoFactorEnabled = true;
    this.showSetupDialog = false;
    this.alertService.success('2FA activado correctamente', '', 3000);
  }

  // ==================== MÉTODOS DE PREFERENCIAS DE NOTIFICACIONES ====================

  /**
   * Actualiza la preferencia de notificaciones por email
   * Revierte el cambio si la operación falla
   * @param enabled - Estado deseado de las notificaciones por email
   */
  handleEmailNotificationsChange(enabled: boolean): void {
    this.preferencesService.updateNotificationPreferences({
      email_notifications: enabled
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertService.success(
            enabled
              ? 'Notificaciones por email activadas'
              : 'Notificaciones por email desactivadas',
            '',
            2000
          );
        },
        error: () => {
          this.emailNotifications = !enabled;
          this.alertService.error('Error al actualizar preferencias', '', 3000);
        }
      });
  }

  /**
   * Actualiza la preferencia de alertas de inicio de sesión
   * Revierte el cambio si la operación falla
   * @param enabled - Estado deseado de las alertas de login
   */
  handleLoginAlertsChange(enabled: boolean): void {
    this.preferencesService.updateNotificationPreferences({
      login_alerts: enabled
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertService.success(
            enabled
              ? 'Alertas de inicio de sesión activadas'
              : 'Alertas de inicio de sesión desactivadas',
            '',
            2000
          );
        },
        error: () => {
          this.loginAlerts = !enabled;
          this.alertService.error('Error al actualizar preferencias', '', 3000);
        }
      });
  }

  // ==================== MÉTODOS DE GESTIÓN DE SESIONES ====================

  /**
   * Cierra una sesión específica del usuario
   * Solicita confirmación antes de proceder
   * @param sessionId - ID de la sesión a cerrar
   */
  async closeSession(sessionId: number): Promise<void> {
    const confirmed = await this.alertService.confirm(
      'Cerrar sesión',
      '¿Estás seguro de cerrar esta sesión?'
    );

    if (!confirmed) return;

    this.userService.revokeSession(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.activeSessions = this.activeSessions.filter(s => s.id !== sessionId);
          this.alertService.success('Sesión cerrada correctamente', '', 2000);
        },
        error: (error) => {
          const message = error.error?.detail || 'Error al cerrar sesión';
          this.alertService.error(message, '', 3000);
        }
      });
  }

  /**
   * Cierra todas las sesiones activas excepto la actual
   * Solicita confirmación antes de proceder
   * El usuario deberá volver a iniciar sesión en los dispositivos afectados
   */
  async closeAllSessions(): Promise<void> {
    const confirmed = await this.alertService.confirm(
      'Cerrar todas las sesiones',
      '¿Deseas cerrar todas las demás sesiones activas? Tendrás que iniciar sesión nuevamente en esos dispositivos.'
    );

    if (!confirmed) return;

    this.userService.revokeAllSessions(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.activeSessions = this.activeSessions.filter(s => s.current);
          this.alertService.success(
            `${response.count} sesión(es) cerrada(s) exitosamente`,
            '',
            3000
          );
        },
        error: (error) => {
          const message = error.error?.detail || 'Error al cerrar sesiones';
          this.alertService.error(message, '', 3000);
        }
      });
  }

  // ==================== MÉTODOS AUXILIARES Y FORMATEO ====================

  /**
   * Formatea la fecha de última actividad en formato legible
   * Muestra tiempo relativo para fechas recientes y formato completo para fechas antiguas
   * @param lastActive - String con la fecha en formato ISO
   * @returns String formateado con tiempo relativo o fecha completa
   */
  formatLastActive(lastActive: string): string {
    try {
      const date = new Date(lastActive);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Activo ahora';
      if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return lastActive;
    }
  }

  // ==================== GETTERS Y VALIDACIONES ====================

  /**
   * Verifica si las contraseñas nueva y de confirmación coinciden
   * @returns true si las contraseñas son iguales
   */
  get passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }

  /**
   * Valida si el formulario de cambio de contraseña es válido
   * Verifica que todos los campos estén completos, longitud mínima y coincidencia
   * @returns true si el formulario es válido y puede ser enviado
   */
  get isPasswordFormValid(): boolean {
    return (
      this.currentPassword.length > 0 &&
      this.newPassword.length >= 6 &&
      this.passwordsMatch
    );
  }
}
