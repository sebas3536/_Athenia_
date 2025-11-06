// src/app/features/convocatorias/services/deadline.service.ts

import { Injectable } from '@angular/core';
import { DeadlineStatus } from 'src/app/domain/models/convocatorias.model';

/**
 * Servicio para calcular estados, textos, colores e iconos de fechas límite.
 * Útil para mostrar badges, alertas y progreso de convocatorias.
 */
@Injectable({
  providedIn: 'root'
})
export class DeadlineService {
  // ==================================================================
  // ESTADOS DE FECHA LÍMITE
  // ==================================================================

  /** Colores para badges de estado */
  private readonly BADGE_COLORS: Record<DeadlineStatus, string> = {
    safe: 'bg-green-100 border-green-300',
    warning: 'bg-yellow-100 border-yellow-300',
    critical: 'bg-orange-100 border-orange-300',
    overdue: 'bg-red-100 border-red-300'
  };

  /** Colores para indicadores (puntos, barras, etc.) */
  private readonly INDICATOR_COLORS: Record<DeadlineStatus, string> = {
    safe: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-orange-500',
    overdue: 'bg-red-500'
  };

  /** Iconos Lucide según estado */
  private readonly ICONS: Record<DeadlineStatus, string> = {
    safe: 'Calendar',
    warning: 'Clock',
    critical: 'AlertCircle',
    overdue: 'XCircle'
  };

  // ==================================================================
  // CÁLCULO DE ESTADO
  // ==================================================================

  /**
   * Determina el estado de urgencia de una fecha límite.
   * @param endDate Fecha límite de la convocatoria
   * @returns `'safe' | 'warning' | 'critical' | 'overdue'`
   */
  getDeadlineStatus(endDate?: Date): DeadlineStatus {
    if (!endDate) return 'safe';

    const now = this.normalizeDate(new Date());
    const deadline = this.normalizeDate(new Date(endDate));
    const daysLeft = this.calculateDaysLeft(now, deadline);

    if (daysLeft < 0) return 'overdue';
    if (daysLeft <= 3) return 'critical';
    if (daysLeft <= 7) return 'warning';
    return 'safe';
  }

  /**
   * Calcula los días restantes hasta la fecha límite.
   * @param endDate Fecha límite
   * @returns Número de días (puede ser negativo si ya venció)
   */
  getDaysRemaining(endDate?: Date): number | null {
    if (!endDate) return null;

    const now = this.normalizeDate(new Date());
    const deadline = this.normalizeDate(new Date(endDate));
    return this.calculateDaysLeft(now, deadline);
  }

  /**
   * Genera texto descriptivo del estado de la fecha límite.
   * @param endDate Fecha límite
   * @returns Texto amigable para UI
   */
  getDeadlineText(endDate?: Date): string {
    if (!endDate) return '';

    const daysLeft = this.getDaysRemaining(endDate);
    if (daysLeft === null) return '';

    if (daysLeft < 0) {
      const abs = Math.abs(daysLeft);
      return `Vencida hace ${abs} día${abs !== 1 ? 's' : ''}`;
    }
    if (daysLeft === 0) return '¡Vence hoy!';
    if (daysLeft === 1) return 'Vence mañana';

    return `${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`;
  }

  // ==================================================================
  // ESTILOS VISUALES
  // ==================================================================

  /**
   * Obtiene clases Tailwind para el badge de estado.
   * @param status Estado de la fecha límite
   */
  getDeadlineColor(status: DeadlineStatus): string {
    return this.BADGE_COLORS[status];
  }

  /**
   * Obtiene clase Tailwind para indicador (punto, barra, etc.).
   * @param status Estado de la fecha límite
   */
  getDeadlineIndicator(status: DeadlineStatus): string {
    return this.INDICATOR_COLORS[status];
  }

  /**
   * Obtiene nombre del icono Lucide según estado.
   * @param status Estado de la fecha límite
   */
  getDeadlineIcon(status: DeadlineStatus): string {
    return this.ICONS[status];
  }

  // ==================================================================
  // FORMATO DE FECHAS
  // ==================================================================

  /**
   * Convierte una fecha a formato `yyyy-MM-dd` para inputs tipo date.
   * @param date Fecha a formatear
   */
  toInputDateFormat(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // ==================================================================
  // MÉTODOS PRIVADOS
  // ==================================================================

  /** Normaliza fecha a medianoche (00:00:00.000) */
  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  /** Calcula días entre dos fechas normalizadas */
  private calculateDaysLeft(from: Date, to: Date): number {
    const diff = to.getTime() - from.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}