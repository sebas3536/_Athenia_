/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/features/history/components/history.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Api } from '../../services/api/api';
import { AlertService } from '@shared/components/alert/alert.service';

/**
 * Representa una entrada en el historial de actividades.
 */
interface ActivityLog {
  action: string;
  document_name?: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * Estadística mostrada en tarjetas.
 */
interface Stat {
  label: string;
  value: string;
  icon: string;
  color: string;
}

/**
 * Componente para visualizar el historial de actividades del sistema.
 * Incluye filtrado, paginación, estadísticas y exportación.
 */
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    HttpClientModule,
    RouterModule,
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class History implements OnInit {
  // ==================================================================
  // ESTADO REACTIVO
  // ==================================================================

  activities: ActivityLog[] = [];
  filteredActivities: ActivityLog[] = [];
  loading = false;
  loadingMore = false;
  errorMessage: string | null = null;
  limit = 20;
  includeAllUsers = false;
  searchQuery = '';
  filterType: 'all' | 'upload' | 'download' | 'process' | 'edit' | 'delete' | 'error' = 'all';

  // ==================================================================
  // ESTADÍSTICAS
  // ==================================================================

  stats: Stat[] = [
    {
      label: 'Total Acciones',
      value: '0',
      icon: 'history',
      color: 'bg-blue-500'
    },
    {
      label: 'Subidos Este Mes',
      value: '0',
      icon: 'upload',
      color: 'bg-purple-500'
    },
    {
      label: 'Errores',
      value: '0',
      icon: 'x-circle',
      color: 'bg-red-500'
    }
  ];

  // ==================================================================
  // SERVICIOS
  // ==================================================================

  private apiService = inject(Api);
  private alertService = inject(AlertService);

  // ==================================================================
  // CONSTANTES VISUALES
  // ==================================================================

  private readonly ACTIVITY_TYPES = {
    upload: ['upload', 'subido', 'document_uploaded'],
    download: ['download', 'descarga'],
    process: ['process', 'procesado'],
    edit: ['edit', 'editado', 'update'],
    delete: ['delete', 'eliminado', 'removed'],
    error: ['error', 'failed']
  } as const;

  private readonly ICON_MAP: Record<keyof typeof this.ACTIVITY_TYPES | 'default', string> = {
    upload: 'upload',
    download: 'download',
    process: 'check-circle',
    edit: 'edit',
    delete: 'trash-2',
    error: 'x-circle',
    default: 'file-text'
  };

  private readonly COLOR_MAP: Record<keyof typeof this.ACTIVITY_TYPES | 'default', string> = {
    upload: 'bg-blue-500',
    download: 'bg-purple-500',
    process: 'bg-[#02ab74]',
    edit: 'bg-orange-500',
    delete: 'bg-gray-500',
    error: 'bg-red-500',
    default: 'bg-gray-500'
  };

  private readonly LABEL_MAP: Record<keyof typeof this.ACTIVITY_TYPES | 'default', string> = {
    upload: 'Documento subido',
    download: 'Documento descargado',
    process: 'Documento procesado',
    edit: 'Documento editado',
    delete: 'Documento eliminado',
    error: 'Error al procesar',
    default: 'Acción'
  };

  // ==================================================================
  // CICLO DE VIDA
  // ==================================================================

  ngOnInit(): void {
    this.getRecentActivities();
  }

  // ==================================================================
  // CARGA DE DATOS
  // ==================================================================

  /** Carga actividades recientes */
  private getRecentActivities(): void {
    this.loading = true;
    this.errorMessage = null;

    this.apiService.getRecentActivities(this.limit, this.includeAllUsers).subscribe({
      next: data => {
        this.activities = data.map(a => ({
          ...a,
          timestamp: this.convertToUTCMinus5(a.timestamp)
        }));
        this.filterActivities();
        this.updateStats();
        this.loading = false;
        this.alertService.success('Actividades cargadas correctamente', '');
      },
      error: () => {
        this.errorMessage = 'Error al cargar las actividades recientes';
        this.loading = false;
        this.alertService.error('No se pudieron cargar las actividades recientes', '');
      }
    });
  }

  /** Carga más actividades (paginación) */
  loadMore(): void {
    this.loadingMore = true;
    this.limit += 20;

    this.apiService.getRecentActivities(this.limit, this.includeAllUsers).subscribe({
      next: data => {
        this.activities = data.map(a => ({
          ...a,
          timestamp: this.convertToUTCMinus5(a.timestamp)
        }));
        this.filterActivities();
        this.updateStats();
        this.loadingMore = false;
        this.alertService.info('Se cargaron más actividades', '');
      },
      error: () => {
        this.loadingMore = false;
        this.alertService.error('Error al cargar más actividades', '');
      }
    });
  }

  // ==================================================================
  // FILTRADO
  // ==================================================================

  /** Aplica filtros de búsqueda y tipo */
  filterActivities(): void {
    this.filteredActivities = this.activities.filter(activity => {
      const matchesSearch = !this.searchQuery ||
        activity.document_name?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        this.getActionLabel(activity.action).toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesFilter = this.filterType === 'all' ||
        this.getActivityType(activity.action) === this.filterType;

      return matchesSearch && matchesFilter;
    });
  }

  // ==================================================================
  // ESTADÍSTICAS
  // ==================================================================

  /** Actualiza tarjetas de estadísticas */
  private updateStats(): void {
    const totalActions = this.activities.length;

    const now = new Date();
    const thisMonthUploads = this.activities.filter(a => {
      const date = new Date(a.timestamp);
      return this.isUploadAction(a.action) &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
    }).length;

    const errors = this.activities.filter(a => this.isErrorAction(a.action)).length;

    this.stats = [
      {
        label: 'Total Acciones',
        value: totalActions.toLocaleString(),
        icon: 'history',
        color: 'bg-blue-500'
      },
      {
        label: 'Subidos Este Mes',
        value: thisMonthUploads.toLocaleString(),
        icon: 'upload',
        color: 'bg-purple-500'
      },
      {
        label: 'Errores',
        value: errors.toLocaleString(),
        icon: 'x-circle',
        color: 'bg-red-500'
      }
    ];
  }

  // ==================================================================
  // UTILIDADES DE ACCIONES
  // ==================================================================

  /** Determina el tipo de actividad */
  private getActivityType(action: string): keyof typeof this.ACTIVITY_TYPES | 'default' {
    const lower = action.toLowerCase();
    for (const [type, keywords] of Object.entries(this.ACTIVITY_TYPES)) {
      if (keywords.some(k => lower.includes(k))) {
        return type as keyof typeof this.ACTIVITY_TYPES;
      }
    }
    return 'default';
  }

  /** Obtiene etiqueta legible */
  getActionLabel(action: string): string {
    const type = this.getActivityType(action);
    return this.LABEL_MAP[type];
  }

  /** Obtiene ícono Lucide */
  getActivityIcon(action: string): string {
    const type = this.getActivityType(action);
    return this.ICON_MAP[type];
  }

  /** Obtiene color de fondo */
  getActivityColor(action: string): string {
    const type = this.getActivityType(action);
    return this.COLOR_MAP[type];
  }

  /** Ícono de estado (éxito/error) */
  getStatusIcon(action: string): string {
    return this.isErrorAction(action) ? 'x-circle' : 'check-circle';
  }

  /** Color de estado */
  getStatusColor(action: string): string {
    return this.isErrorAction(action) ? 'text-red-500' : 'text-green-500';
  }

  /** Verifica si es acción de subida */
  private isUploadAction(action: string): boolean {
    return this.ACTIVITY_TYPES.upload.some(k => action.toLowerCase().includes(k));
  }

  /** Verifica si es acción de error */
  private isErrorAction(action: string): boolean {
    return this.ACTIVITY_TYPES.error.some(k => action.toLowerCase().includes(k));
  }

  // ==================================================================
  // EXPORTACIÓN
  // ==================================================================

  exportPDF(): void {
    this.alertService.info('La función de exportar a PDF estará disponible pronto.', '');
  }

  exportExcel(): void {
    this.alertService.info('La función de exportar a Excel estará disponible pronto.', '');
  }

  // ==================================================================
  // FORMATO DE FECHA
  // ==================================================================

  /**
   * Convierte fecha UTC a UTC-5 (Colombia) con formato legible.
   * @param dateString Fecha en formato ISO
   */
  convertToUTCMinus5(dateString: string): string {
    const date = new Date(dateString);
    const utcMinus5 = new Date(date.getTime() - 5 * 60 * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${utcMinus5.getFullYear()}-${pad(utcMinus5.getMonth() + 1)}-${pad(utcMinus5.getDate())} ` +
           `${pad(utcMinus5.getHours())}:${pad(utcMinus5.getMinutes())}:${pad(utcMinus5.getSeconds())}`;
  }
}