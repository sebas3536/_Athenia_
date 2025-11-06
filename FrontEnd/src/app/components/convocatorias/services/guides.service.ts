/* eslint-disable @angular-eslint/prefer-inject */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpUploadProgressEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError} from 'rxjs/operators';
import { AuthHeaderService } from 'src/app/services/api/auth-header.service';
import { environment } from 'src/environments/environment.development';

/**
 * Respuesta del backend al subir una guía.
 */
export interface GuideUploadResponse {
  id: number;
  document_id: number;
  filename: string;
  uploaded_at: string;
  uploaded_by: string;
}

/**
 * Información detallada de una guía.
 */
export interface GuideInfo {
  id: number;
  filename: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
}

/**
 * Progreso de subida de archivo.
 */
export interface UploadProgress {
  progress: number;
  loaded: number;
  total: number;
}

/**
 * Servicio para gestionar guías de documentos en convocatorias.
 * Soporta subida, descarga, eliminación y validación.
 */
@Injectable({
  providedIn: 'root'
})
export class GuidesService {
  // ==================================================================
  // CONFIGURACIÓN
  // ==================================================================

  private readonly API_URL = environment.apiUrl;
  private readonly CONVOCATORIAS_URL = `${this.API_URL}/convocatorias`;

  private readonly ALLOWED_GUIDE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ] as const;

  private readonly MAX_GUIDE_SIZE = 20 * 1024 * 1024; // 20 MB

  // ==================================================================
  // CONSTRUCTOR
  // ==================================================================

  constructor(
    private http: HttpClient,
    private authHeaderService: AuthHeaderService
  ) {}

  // ==================================================================
  // MÉTODOS PRIVADOS
  // ==================================================================

  /** Obtiene headers de autenticación */
  private getHeaders() {
    return this.authHeaderService.getAuthHeaders();
  }

  // ==================================================================
  // SUBIDA DE GUÍAS
  // ==================================================================

  /**
   * Sube una guía para un documento específico.
   * @param convId ID de la convocatoria
   * @param docId ID del documento
   * @param file Archivo de la guía
   * @returns Observable con respuesta del servidor
   */
  uploadGuideDocument(
    convId: string,
    docId: string,
    file: File
  ): Observable<any> {
    if (!convId || !docId || !file) {
      return throwError(() => new Error('Faltan parámetros requeridos'));
    }

    const formData = new FormData();
    formData.append('files', file);

    const headers = this.authHeaderService.getAuthHeaders().delete('Content-Type');

    return this.http.post<any>(
      `${this.CONVOCATORIAS_URL}/${convId}/documents/${docId}/guide`,
      formData,
      { headers }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // ==================================================================
  // DESCARGA DE GUÍAS
  // ==================================================================

  /**
   * Descarga la guía de un documento como Blob.
   * @param convId ID de la convocatoria
   * @param docId ID del documento
   * @returns Observable con el archivo en formato Blob
   */
  downloadGuideDocument(convId: string, docId: string): Observable<Blob> {
    return this.http.get(
      `${this.CONVOCATORIAS_URL}/${convId}/documents/${docId}/guide/download`,
      { headers: this.getHeaders(), responseType: 'blob' }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // ==================================================================
  // INFORMACIÓN DE GUÍA
  // ==================================================================

  /**
   * Obtiene información detallada de una guía.
   * @param guideId ID de la guía
   * @returns Observable con información de la guía
   */
  getGuideInfo(guideId: number): Observable<GuideInfo> {
    return this.http.get<GuideInfo>(
      `${this.API_URL}/guide-documents/${guideId}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // ==================================================================
  // ELIMINACIÓN DE GUÍAS
  // ==================================================================

  /**
   * Elimina la guía de un documento.
   * @param convId ID de la convocatoria
   * @param docId ID del documento
   * @returns Observable con respuesta del servidor
   */
  deleteGuideDocument(convId: string, docId: string): Observable<any> {
    return this.http.delete(
      `${this.CONVOCATORIAS_URL}/${convId}/documents/${docId}/guide`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // ==================================================================
  // VALIDACIÓN DE ARCHIVOS
  // ==================================================================

  /**
   * Verifica si el tipo de archivo está permitido.
   * @param file Archivo a validar
   */
  isGuideTypeAllowed(file: File): boolean {
    return this.ALLOWED_GUIDE_TYPES.includes(file.type as any);
  }

  /**
   * Verifica si el tamaño del archivo está dentro del límite.
   * @param file Archivo a validar
   */
  isGuideSizeValid(file: File): boolean {
    return file.size <= this.MAX_GUIDE_SIZE;
  }

  /**
   * Obtiene mensaje de error de validación.
   * @param file Archivo a validar
   * @returns Mensaje de error o null si es válido
   */
  getValidationError(file: File): string | null {
    if (!this.isGuideTypeAllowed(file)) {
      return 'Tipo de archivo no permitido. Solo PDF, Word y TXT.';
    }
    if (!this.isGuideSizeValid(file)) {
      const maxMB = this.MAX_GUIDE_SIZE / (1024 * 1024);
      return `El tamaño máximo es ${maxMB} MB`;
    }
    return null;
  }

  // ==================================================================
  // PROGRESO DE SUBIDA
  // ==================================================================

  /**
   * Extrae progreso de un evento HTTP de subida.
   * @param event Evento HTTP
   * @returns Objeto con progreso o null
   */
  extractUploadProgress(event: HttpEvent<any>): UploadProgress | null {
    if (event.type === 1) {
      const uploadEvent = event as HttpUploadProgressEvent;
      return {
        progress: uploadEvent.total
          ? Math.round((100 * uploadEvent.loaded) / uploadEvent.total)
          : 0,
        loaded: uploadEvent.loaded,
        total: uploadEvent.total || 0
      };
    }
    return null;
  }

  // ==================================================================
  // UTILIDADES DE ARCHIVOS
  // ==================================================================

  /**
   * Obtiene la extensión de un archivo.
   * @param fileName Nombre del archivo
   */
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Determina el tipo legible del documento.
   * @param fileName Nombre del archivo
   */
  getDocumentType(fileName: string): string {
    const extension = this.getFileExtension(fileName);
    const typeMap: Record<string, string> = {
      pdf: 'PDF',
      doc: 'Word',
      docx: 'Word',
      txt: 'Texto'
    };
    return typeMap[extension] || 'Archivo';
  }

  /**
   * Formatea tamaño de archivo en unidades legibles.
   * @param bytes Tamaño en bytes
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}