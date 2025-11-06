/* eslint-disable @angular-eslint/prefer-inject */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/features/convocatorias/services/convocatorias.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, catchError, throwError } from 'rxjs';
import {
  Convocatoria,
  ConvocatoriaProgress,
  ConvocatoriaDocument
} from 'src/app/domain/models/convocatorias.model';
import { AuthHeaderService } from 'src/app/services/api/auth-header.service';
import { DocumentCacheService } from './document-cache.service';
import { environment } from 'src/environments/environment.development';

/**
 * Respuesta del backend para una convocatoria.
 */
interface ConvocatoriaResponse {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  start_date?: string;
  end_date?: string;
  documents?: any[];
  history?: any[];
  collaborators?: any[];
}

/**
 * Respuesta del backend al subir documentos.
 */
interface DocumentUploadResponse {
  successful_uploads?: {
    id: number;
    filename: string;
    status: string;
  }[];
  failed_uploads?: any[];
}

/**
 * Servicio principal para gestionar convocatorias.
 * Maneja CRUD, caché de documentos, progreso y historial.
 */
@Injectable({
  providedIn: 'root'
})
export class ConvocatoriasService {
  // ==================================================================
  // CONFIGURACIÓN
  // ==================================================================

  private readonly API_URL = environment.apiUrl;
  private readonly CONVOCATORIAS_URL = `${this.API_URL}/convocatorias`;

  // ==================================================================
  // ESTADO REACTIVO
  // ==================================================================

  private convocatoriasSubject = new BehaviorSubject<Convocatoria[]>([]);
  public readonly convocatorias$ = this.convocatoriasSubject.asObservable();

  // ==================================================================
  // CONSTRUCTOR
  // ==================================================================

  constructor(
    private http: HttpClient,
    private authHeaderService: AuthHeaderService,
    private documentCacheService: DocumentCacheService
  ) {
    this.loadConvocatorias();
  }

  // ==================================================================
  // MÉTODOS PRIVADOS
  // ==================================================================

  /** Obtiene headers de autenticación */
  private getHeaders() {
    return this.authHeaderService.getAuthHeaders();
  }

  /**
   * Transforma respuesta del backend a modelo `Convocatoria`.
   * @param data Datos crudos del backend
   */
  private parseConvocatoria(data: ConvocatoriaResponse): Convocatoria {
    const convocatoriaId = String(data.id);

    const rawDocuments: ConvocatoriaDocument[] = (data.documents || []).map(d => ({
      id: String(d.id),
      name: d.name || 'Sin nombre',
      status: d.status || 'pending',
      fileName: d.fileName || d.filename || undefined,
      uploadedAt: d.uploaded_at ? new Date(d.uploaded_at) : undefined,
      uploadedBy: d.uploadedBy || d.uploaded_by || undefined,
      document_id: d.document_id || undefined,
      file: d.file || undefined,
      guide: d.guide ? {
        id: d.guide.id,
        fileName: d.guide.fileName || d.guide.filename || 'Guía sin nombre',
        uploadedAt: d.guide.uploadedAt || d.guide.uploaded_at
          ? new Date(d.guide.uploadedAt || d.guide.uploaded_at)
          : undefined,
        uploadedBy: d.guide.uploadedBy || d.guide.uploaded_by
      } : undefined
    }));

    const documents = this.documentCacheService.mergeDocuments(convocatoriaId, rawDocuments);

    return {
      id: convocatoriaId,
      name: data.name,
      description: data.description,
      createdAt: new Date(data.created_at),
      startDate: data.start_date ? new Date(data.start_date) : undefined,
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      documents,
      history: (data.history || []).map(h => ({
        id: String(h.id),
        documentName: h.document_name,
        action: h.action,
        date: new Date(h.timestamp),
        user: h.user_name,
        projectName: data.name
      })),
      collaborators: (data.collaborators || []).map(c => ({
        id: String(c.id),
        name: c.user_name,
        email: c.user_email,
        role: c.role,
        avatar: c.user_name.substring(0, 2).toUpperCase(),
        addedAt: new Date(c.added_at)
      }))
    };
  }

  // ==================================================================
  // CARGA Y REFRESCO
  // ==================================================================

  /** Carga todas las convocatorias desde el backend */
  private loadConvocatorias(): void {
    this.http.get<ConvocatoriaResponse[]>(
      this.CONVOCATORIAS_URL,
      { headers: this.getHeaders() }
    ).pipe(
      map(data => data.map(item => this.parseConvocatoria(item))),
      catchError(() => [])
    ).subscribe(convocatorias => {
      this.convocatoriasSubject.next(convocatorias);
    });
  }

  /** Refresca la lista de convocatorias */
  refreshConvocatorias(): void {
    this.loadConvocatorias();
  }

  // ==================================================================
  // OPERACIONES CRUD
  // ==================================================================

  /**
   * Obtiene una convocatoria por ID con caché.
   * @param id ID de la convocatoria
   */
  getById(id: string): Observable<Convocatoria> {
    return this.http.get<ConvocatoriaResponse>(
      `${this.CONVOCATORIAS_URL}/${id}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(data => {
        const convocatoria = this.parseConvocatoria(data);
        convocatoria.documents.forEach(doc =>
          this.documentCacheService.cacheDocument(id, doc)
        );
        return convocatoria;
      }),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Crea una nueva convocatoria.
   */
  create(
    name: string,
    description?: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<Convocatoria> {
    const payload = {
      name,
      description: description || null,
      start_date: startDate ? startDate.toISOString().split('T')[0] : null,
      end_date: endDate ? endDate.toISOString().split('T')[0] : null
    };

    return this.http.post<ConvocatoriaResponse>(
      this.CONVOCATORIAS_URL,
      payload,
      { headers: this.getHeaders() }
    ).pipe(
      map(data => this.parseConvocatoria(data)),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Actualiza una convocatoria existente.
   */
  update(
    id: string,
    data: {
      name?: string;
      description?: string;
      start_date?: Date;
      end_date?: Date;
    }
  ): Observable<Convocatoria> {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.description) payload.description = data.description;
    if (data.start_date) payload.start_date = data.start_date.toISOString().split('T')[0];
    if (data.end_date) payload.end_date = data.end_date.toISOString().split('T')[0];

    return this.http.put<ConvocatoriaResponse>(
      `${this.CONVOCATORIAS_URL}/${id}`,
      payload,
      { headers: this.getHeaders() }
    ).pipe(
      map(data => this.parseConvocatoria(data)),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Elimina una convocatoria.
   */
  delete(id: string): Observable<any> {
    return this.http.delete(
      `${this.CONVOCATORIAS_URL}/${id}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // ==================================================================
  // GESTIÓN DE DOCUMENTOS
  // ==================================================================

  /**
   * Agrega un documento al checklist (con o sin archivo).
   */
  addDocumentToChecklist(
    convId: string,
    documentName: string,
    file?: File
  ): Observable<any> {
    if (!convId?.trim()) {
      return throwError(() => new Error('Convocatoria ID es requerido'));
    }
    const trimmedName = documentName?.trim();
    if (!trimmedName) {
      return throwError(() => new Error('Nombre del documento es requerido'));
    }

    if (!file) {
      const payload = { name: trimmedName };
      const headers = this.getHeaders().set('Content-Type', 'application/json');

      return this.http.post<DocumentUploadResponse>(
        `${this.CONVOCATORIAS_URL}/${convId}/documents`,
        payload,
        { headers }
      ).pipe(
        catchError(error => throwError(() => error))
      );
    }

    const formData = new FormData();
    formData.append('name', trimmedName);
    formData.append('files', file);

    const headers = this.authHeaderService.getAuthHeaders().delete('Content-Type');

    return this.http.post<DocumentUploadResponse>(
      `${this.CONVOCATORIAS_URL}/${convId}/documents`,
      formData,
      { headers }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Sube un archivo a un ítem existente del checklist.
   */
  uploadDocumentToExistingChecklist(
    convId: string,
    checklistId: string,
    file: File
  ): Observable<any> {
    if (!convId || !checklistId || !file) {
      return throwError(() => new Error('Parámetros faltantes'));
    }

    const formData = new FormData();
    formData.append('files', file);
    formData.append('name', file.name);

    const headers = this.authHeaderService.getAuthHeaders().delete('Content-Type');

    return this.http.post<any>(
      `${this.CONVOCATORIAS_URL}/${convId}/documents/${checklistId}/upload`,
      formData,
      { headers }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Elimina un documento (compatible con rutas antiguas y nuevas).
   */
  deleteDocument(
    convId: string,
    docId: string,
    checklistId?: string
  ): Observable<any> {
    if (!convId || !docId) {
      return throwError(() => new Error('convId y docId son requeridos'));
    }

    const endpoint = checklistId
      ? `${this.CONVOCATORIAS_URL}/${convId}/checklists/${checklistId}/documents/${docId}`
      : `${this.CONVOCATORIAS_URL}/${convId}/documents/${docId}`;

    return this.http.delete(endpoint, { headers: this.getHeaders() }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Actualiza el nombre de un documento.
   */
  updateDocumentName(
    convId: string,
    docId: string,
    newName: string
  ): Observable<any> {
    const payload = { name: newName };
    return this.http.put(
      `${this.CONVOCATORIAS_URL}/${convId}/documents/${docId}`,
      payload,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Descarga un documento como Blob.
   */
  downloadDocument(documentId: number): Observable<Blob> {
    return this.http.get(
      `${this.API_URL}/documents/${documentId}/download`,
      { headers: this.getHeaders(), responseType: 'blob' }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // ==================================================================
  // PROGRESO
  // ==================================================================

  /**
   * Calcula el progreso de una convocatoria.
   */
  calculateProgress(conv: Convocatoria): ConvocatoriaProgress {
    if (!conv.documents?.length) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const total = conv.documents.length;
    const completed = conv.documents.filter(d => d.status === 'completed').length;

    return {
      completed,
      total,
      percentage: (completed / total) * 100
    };
  }

  // ==================================================================
  // HISTORIAL
  // ==================================================================

  /**
   * Obtiene el historial de una convocatoria.
   */
  getHistory(convId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.CONVOCATORIAS_URL}/${convId}/history`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(() => [])
    );
  }

  // ==================================================================
  // CHECKLISTS (AVANZADO)
  // ==================================================================

  /**
   * Elimina un documento de un checklist específico.
   */
  deleteDocumentFromChecklist(
    convId: string,
    checklistId: string,
    docId: string
  ): Observable<any> {
    if (!convId || !checklistId || !docId) {
      return throwError(() => new Error('Faltan parámetros requeridos'));
    }

    return this.http.delete(
      `${this.CONVOCATORIAS_URL}/${convId}/checklists/${checklistId}/documents/${docId}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Elimina un checklist completo.
   */
  deleteChecklist(
    convId: string,
    checklistId: string
  ): Observable<any> {
    if (!convId || !checklistId) {
      return throwError(() => new Error('Faltan parámetros requeridos'));
    }

    return this.http.delete(
      `${this.CONVOCATORIAS_URL}/${convId}/checklists/${checklistId}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }
}