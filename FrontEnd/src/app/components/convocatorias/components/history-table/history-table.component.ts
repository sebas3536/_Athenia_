/* eslint-disable @angular-eslint/prefer-inject */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Representa una entrada en el historial de acciones sobre documentos.
 */
interface HistoryEntry {
  id: string | number;
  documentName: string;
  action: string;
  user: string;
  date: Date | string;
}

/**
 * Componente para mostrar el historial de acciones en una tabla paginada,
 * con soporte para múltiples formatos de entrada y normalización de datos.
 * Mantiene un historial local persistente entre cambios de input.
 */
@Component({
  selector: 'app-history-table',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './history-table.component.html',
  styleUrls: ['./history-table.component.css'],
})
export class HistoryTableComponent implements OnInit, OnChanges {
  // ==================================================================
  // INPUTS
  // ==================================================================

  /** Historial recibido desde el componente padre */
  @Input() history: any[] = [];

  // ==================================================================
  // ESTADO LOCAL
  // ==================================================================

  /** Historial normalizado y acumulado localmente */
  private localHistory: HistoryEntry[] = [];

  /** Configuración de paginación */
  pageSize = 5;
  currentPage = 1;

  // ==================================================================
  // LIFECYCLE HOOKS
  // ==================================================================

  /** Inicializa el historial local al cargar el componente */
  ngOnInit(): void {
    this.updateLocalHistory();
  }

  /**
   * Detecta cambios en el input `history` y actualiza el historial local
   * solo con nuevos elementos (evita duplicados).
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['history'] && !changes['history'].firstChange) {
      this.updateLocalHistory();
      this.goToPage(1);
    }
  }

  // ==================================================================
  // GESTIÓN DEL HISTORIAL LOCAL
  // ==================================================================

  /**
   * Actualiza el historial local agregando solo nuevos elementos
   * no presentes previamente (por ID).
   */
  private updateLocalHistory(): void {
    if (!this.history?.length) return;

    const newItems = this.history.filter(
      item => !this.localHistory.some(local => local.id === item.id)
    );

    if (newItems.length > 0) {
      this.localHistory = [
        ...this.localHistory,
        ...newItems.map(item => this.normalizeEntry(item))
      ];
    }
  }

  /**
   * Normaliza una entrada cruda del historial a la interfaz `HistoryEntry`,
   * manejando múltiples nombres de campos posibles.
   */
  private normalizeEntry(entry: any): HistoryEntry {
    return {
      id: entry.id ?? Math.random(),
      documentName: entry.documentName || entry.document_name || 'Sin nombre',
      action: entry.action || 'unknown',
      user: entry.user || entry.user_name || 'Usuario desconocido',
      date: entry.date || entry.timestamp || new Date()
    };
  }

  // ==================================================================
  // GETTERS (basados en localHistory)
  // ==================================================================

  /** Historial ordenado por fecha descendente (más reciente primero) */
  get sortedHistory(): HistoryEntry[] {
    return [...this.localHistory].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }

  /** Total de entradas en el historial */
  get historyCount(): number {
    return this.localHistory.length;
  }

  // ==================================================================
  // PAGINACIÓN
  // ==================================================================

  /** Entradas visibles en la página actual */
  get paginatedHistory(): HistoryEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.sortedHistory.slice(start, end);
  }

  /** Total de páginas disponibles */
  get totalPages(): number {
    return Math.ceil(this.historyCount / this.pageSize);
  }

  /** Inicio del rango de la página actual (ej: 1) */
  get pageRangeStart(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  /** Fin del rango de la página actual (ej: 5) */
  get pageRangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.historyCount);
  }

  // ==================================================================
  // NAVEGACIÓN DE PÁGINAS
  // ==================================================================

  /**
   * Navega a una página específica.
   * @param page Número de página (1-based)
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  /** Avanza a la siguiente página */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  /** Retrocede a la página anterior */
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // ==================================================================
  // UTILIDADES DE FORMATO
  // ==================================================================

  /**
   * Convierte una acción técnica en una etiqueta legible en español.
   */
  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      uploaded: 'Subido',
      created: 'Creado',
      deleted: 'Eliminado',
      updated: 'Actualizado',
      renamed: 'Renombrado',
      collaborator_added: 'Colaborador Agregado',
      collaborator_removed: 'Colaborador Removido',
      guide_uploaded: 'Guía Subida',
      guide_deleted: 'Guía Eliminada'
    };

    return labels[action] || action.charAt(0).toUpperCase() + action.slice(1);
  }

  /**
   * Formatea una fecha a `dd/mm/yyyy` en zona horaria UTC-5.
   */
  formatDate(date: Date | string): string {
    const d = new Date(date);
    d.setHours(d.getUTCHours() - 5);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  }

  /**
   * Formatea una hora a `HH:MM:SS` en zona horaria UTC-5.
   */
  formatTime(date: Date | string): string {
    const d = new Date(date);
    d.setHours(d.getUTCHours() - 5);

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Cuenta cuántas veces ocurrió una acción específica.
   */
  getActionCount(action: string): number {
    return this.localHistory.filter(item => item.action === action).length;
  }

  /**
   * TrackBy para *ngFor: mejora rendimiento al evitar recrear DOM.
   */
  trackByHistoryId(_index: number, item: HistoryEntry): any {
    return item.id;
  }

  // ==================================================================
  // MÉTODOS PÚBLICOS (API del componente)
  // ==================================================================

  /**
   * Reinicia el historial local (útil para limpiar o recargar).
   */
  resetHistory(): void {
    this.localHistory = [];
    this.currentPage = 1;
  }
}