// src/app/features/convocatorias/services/utils.service.ts

import { Injectable } from '@angular/core';
import { Convocatoria, ConvocatoriaProgress } from 'src/app/domain/models/convocatorias.model';

/**
 * Servicio de utilidades para convocatorias.
 * Proporciona formateo de fechas, progreso, estilos dinámicos, validaciones de archivos y lógica de deadlines.
 * Totalmente independiente del DOM y reutilizable.
 */
@Injectable({
  providedIn: 'root',
})
export class ConvocatoriasUtilsService {
  // ==================== FORMATEO DE FECHAS ====================

  /**
   * Formatea fecha en tiempo relativo (ej: "Hace 5 min", "Hace 2 días").
   * Si es antigua, muestra formato corto: "29 oct 2025".
   */
  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (minutes < 1) return 'Justo ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    if (weeks < 4) return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
    if (months < 12) return `Hace ${months} mes${months > 1 ? 'es' : ''}`;

    return dateObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Formato completo con día de la semana y hora.
   * Ej: "miércoles, 15 de febrero de 2025, 14:30".
   */
  formatFullDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formato corto de fecha sin hora.
   * Ej: "15 feb 2025".
   */
  formatDateOnly(date: Date | string | null | undefined): string {
    if (!date) return '';

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  }

  // ==================== PROGRESO Y ESTADO ====================

  /**
   * Calcula el progreso de documentos completados.
   */
  calculateProgress(conv: Convocatoria): ConvocatoriaProgress {
    const total = conv.documents.length;
    const completed = conv.documents.filter((d) => d.status === 'completed').length;
    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  // ==================== ESTILOS DINÁMICOS ====================

  /**
   * Clases CSS para badges de acciones del historial.
   */
  getActionBadgeClass(action: string): string {
    const classes: Record<string, string> = {
      created: 'bg-green-100 text-green-700',
      uploaded: 'bg-blue-100 text-blue-700',
      deleted: 'bg-red-100 text-red-700',
      updated: 'bg-yellow-100 text-yellow-700',
      renamed: 'bg-purple-100 text-purple-700',
      collaborator_added: 'bg-indigo-100 text-indigo-700',
      collaborator_removed: 'bg-orange-100 text-orange-700',
      guide_uploaded: 'bg-teal-100 text-teal-700',
      guide_deleted: 'bg-pink-100 text-pink-700',
      dates_updated: 'bg-cyan-100 text-cyan-700',
    };
    return classes[action] || 'bg-gray-100 text-gray-700';
  }

  /**
   * Etiquetas traducidas para acciones del historial.
   */
  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      created: 'Creado',
      uploaded: 'Subido',
      deleted: 'Eliminado',
      updated: 'Actualizado',
      renamed: 'Renombrado',
      collaborator_added: 'Colaborador agregado',
      collaborator_removed: 'Colaborador eliminado',
      guide_uploaded: 'Guía subida',
      guide_deleted: 'Guía eliminada',
      dates_updated: 'Fechas actualizadas',
    };
    return labels[action] || 'Modificado';
  }

  /**
   * Clases para badge de estado de documento.
   */
  getStatusBadgeClass(isCompleted: boolean): string {
    return isCompleted ? 'bg-[#02ab74] text-white' : 'bg-orange-100 text-orange-800';
  }

  /**
   * Etiqueta de estado de documento.
   */
  getStatusLabel(isCompleted: boolean): string {
    return isCompleted ? 'Completo' : 'En progreso';
  }

  /**
   * Icono Lucide según estado.
   */
  getStatusIcon(isCompleted: boolean): string {
    return isCompleted ? 'Check' : 'Clock';
  }

  // ==================== UTILIDADES DE ARCHIVOS ====================

  /**
   * Dispara clic en input file oculto.
   */
  triggerFileInput(inputId: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) input.click();
  }

  /**
   * Valida extensión de archivo contra lista permitida.
   */
  isFileExtensionAllowed(fileName: string, allowedExtensions: string[] = []): boolean {
    if (allowedExtensions.length === 0) return true;
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? allowedExtensions.includes(extension) : false;
  }

  /**
   * Formatea tamaño de archivo en KB, MB, GB.
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Trunca texto largo con puntos suspensivos.
   */
  truncateText(text: string, maxLength = 50): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // ==================== DEADLINES Y TEMPORALIDAD ====================

  /**
   * Determina estado visual del deadline:
   * - safe: >7 días
   * - warning: 4-7 días
   * - critical: 1-3 días
   * - overdue: vencido
   */
  getDeadlineStatus(
    endDate: Date | string | null | undefined
  ): 'safe' | 'warning' | 'critical' | 'overdue' {
    if (!endDate) return 'overdue';

    const today = this.startOfDay(new Date());
    const deadline = this.startOfDay(new Date(endDate));

    if (this.isBefore(today, this.addDays(deadline, -7))) return 'safe';
    if (this.isBefore(today, this.addDays(deadline, -3))) return 'warning';
    if (this.isBefore(today, deadline)) return 'critical';
    return 'overdue';
  }

  /**
   * Texto descriptivo del deadline.
   * Ej: "Faltan 5 días", "1 día vencido", "Hoy es la fecha límite".
   */
  getDeadlineText(endDate: Date | string | null | undefined): string {
    if (!endDate) return 'Sin fecha límite';

    const deadline = this.startOfDay(new Date(endDate));
    const today = this.startOfDay(new Date());
    const diff = this.getDayDifference(today, deadline);

    if (diff > 0) {
      return diff === 1 ? 'Falta 1 día' : `Faltan ${diff} días`;
    } else if (diff === 0) {
      return 'Hoy es la fecha límite';
    } else {
      const overdue = Math.abs(diff);
      return overdue === 1 ? '1 día vencido' : `${overdue} días vencidos`;
    }
  }

  // ==================== ROLES Y PERMISOS ====================

  /**
   * Etiqueta legible para rol de usuario.
   */
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      editor: 'Editor',
      admin: 'Administrador',
    };
    return labels[role] || role;
  }

  /**
   * Clases CSS para badge de rol.
   */
  getRoleBadgeClass(role: string): string {
    const classes: Record<string, string> = {
      editor: 'bg-yellow-100 text-yellow-800',
      admin: 'bg-green-100 text-green-800',
    };
    return classes[role] || 'bg-gray-100 text-gray-800';
  }

  // ==================== MÉTODOS AUXILIARES PRIVADOS ====================

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private isBefore(date1: Date, date2: Date): boolean {
    return date1 < date2;
  }

  private getDayDifference(date1: Date, date2: Date): number {
    const diffTime = date2.getTime() - date1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
