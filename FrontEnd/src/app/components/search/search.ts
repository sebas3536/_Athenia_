/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of, Subscription } from 'rxjs';
import { Auth as AuthService } from '../authentication/auth/auth';
import { Api as DocumentService } from '../../services/api/api';
import {
  DocumentWithMetadata,
  PaginatedDocumentsResponse,
} from '../../domain/models/document.model';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AlertService } from '@shared/components/alert/alert.service';
/**
 * Componente de búsqueda avanzada de documentos.
 * Soporta: búsqueda por texto, tipo de archivo, paginación, filtrado dinámico,
 * visualización, descarga y eliminación (con confirmación).
 * Respeta permisos de administrador.
 */
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, CommonModule, LucideAngularModule],
  templateUrl: './search.html',
  styleUrls: ['./search.css'],
})
export class Search implements OnDestroy {
  searchQuery = '';
  selectedType: DocumentType | undefined = undefined;
  selectedDate: '' | 'today' | 'week' | 'month' | 'year' = '';
  filteredResults: DocumentWithMetadata[] = [];

  loading = false;
  hasSearched = false;
  currentPage = 0;
  pageSize = 5;
  totalItems = 0;
  totalPages = 0;
  // ==================== SERVICIOS ====================
  private authService = inject(AuthService);
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private alertService = inject(AlertService);
  private subscription = new Subscription();
  private currentUser = this.authService.getCurrentUser();
  // ==================== GETTERS ====================

  /** Indica si el usuario actual es administrador */
  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }
  // ==================== CICLO DE VIDA ====================
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  // ==================== BÚSQUEDA PRINCIPAL ====================

  /** Inicia búsqueda con filtros actuales */
  searchDocuments(): void {
    this.hasSearched = true;
    this.currentPage = 0;
    this.fetchDocuments();
  }

  onFilterChange(): void {
    if (this.hasSearched) {
      this.currentPage = 0;
      this.fetchDocuments();
    }
  }

  private fetchDocuments(): void {
    this.loading = true;

    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      this.loading = false;
      return;
    }

    const skip = this.currentPage * this.pageSize;
    const limit = this.pageSize;

    const userId = this.isAdmin ? undefined : this.currentUser?.id;

    this.subscription.add(
      this.documentService
        .searchDocuments(this.searchQuery, this.selectedType, skip, limit)
        .pipe(
          catchError((err) => {
            this.handleSearchError(err);
            return of({ items: [], total: 0 } as unknown as PaginatedDocumentsResponse);
          })
        )
        .subscribe((response) => {
          this.filteredResults = response.items;
          this.totalItems = response.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.loading = false;
        })
    );
  }

  // ==================== PAGINACIÓN ====================

  /** Cambia página y recarga resultados */
  onPageChange(newPage: number): void {
    if (newPage >= 0 && newPage < this.totalPages) {
      this.currentPage = newPage;
      this.fetchDocuments();
    }
  }

  getPages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }
  // ==================== ESTILOS DINÁMICOS ====================

  /** Clase de ícono según tipo de archivo */
  getDocumentIconClass(document: DocumentWithMetadata): string {
    const iconMap: Record<string, { icon: string; color: string }> = {
      pdf: { icon: 'fas fa-file-pdf', color: 'text-red-500' },
      docx: { icon: 'fas fa-file-word', color: 'text-blue-500' },
      txt: { icon: 'fas fa-file-alt', color: 'text-green-500' },
    };

    const fileType = document.file_type?.toLowerCase();
    const mapping = iconMap[fileType];

    if (mapping) {
      return `${mapping.icon} ${mapping.color}`;
    }

    return 'fas fa-file text-gray-400';
  }

  /** Clase de badge de color según tipo de archivo */
  getFileTypeColorClass(document: DocumentWithMetadata): string {
    const colorMap: Record<string, string> = {
      pdf: 'bg-red-100 text-red-700',
      docx: 'bg-blue-100 text-blue-700',
      txt: 'bg-green-100 text-green-700',
    };

    const fileType = document.file_type?.toLowerCase();
    return colorMap[fileType] || 'bg-gray-100 text-gray-700';
  }
  // ==================== FORMATOS ====================

  /** Formatea fecha en formato legible (ej: "15 ene. 2025") */
  formatDate(date: string | Date | number | null | undefined): string {
    if (!date) return 'Fecha no disponible';
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Fecha no disponible';
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  // ==================== ACCIONES SOBRE DOCUMENTOS ====================

  /**
   * Visualiza documento:
   * - PDF: abre en pestaña nueva
   * - Otros: descarga directa
   */
  viewDocument(doc: DocumentWithMetadata): void {
    this.documentService.downloadDocument(doc.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        if (doc.file_type === 'pdf') {
          window.open(url, '_blank');
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.filename;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      },
      error: () => {
        this.alertService.error('No se pudo visualizar el documento.', '');
      },
    });
  }
  /** Descarga documento como archivo */
  downloadDocument(doc: DocumentWithMetadata): void {
    this.documentService.downloadDocument(doc.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.alertService.success('Descarga completada', ``);
      },
      error: () => {
        this.alertService.error('No se pudo descargar el documento.', '');
      },
    });
  }
  /** Elimina documento tras confirmación */
  deleteDocument(document: DocumentWithMetadata): void {
    this.alertService
      .confirm(`¿Eliminar ${document.filename}?`, 'Esta acción no se puede deshacer.')
      .then((confirmed) => {
        if (!confirmed) return;

        this.documentService.deleteDocument(document.id).subscribe({
          next: () => {
            this.fetchDocuments();
            this.alertService.success('Documento Eliminado', ``);
          },
          error: () => {
            this.alertService.error('No se pudo eliminar el documento.', '');
          },
        });
      });
  }
  // ==================== MANEJO DE ERRORES ====================

  /** Maneja errores de búsqueda y notifica al usuario */

  private handleSearchError(error: unknown): void {
    console.error('Error en búsqueda:', error);
    this.alertService.error('Ocurrió un problema al buscar documentos.', '');
    this.loading = false;
  }
}
