/* eslint-disable @angular-eslint/prefer-inject */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/features/convocatorias/services/documents.service.ts

import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpEvent,
  HttpEventType,
  HttpUploadProgressEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthHeaderService } from 'src/app/services/api/auth-header.service';
import { environment } from 'src/environments/environment.development';

/**
 * Progreso de subida de archivo.
 */
export interface UploadProgress {
  progress: number;
  loaded: number;
  total: number;
}

/**
 * Respuesta del backend al subir un documento.
 */
export interface DocumentUploadResponse {
  id: number;
  name: string;
  file_name: string;
  document_type: string;
  file_size: number;
  created_at: string;
  uploaded_by: string;
}

/**
 * Servicio para gestionar documentos generales (subida, descarga, info, eliminación).
 * Incluye soporte para progreso, validación y utilidades de archivos.
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentsService {
  // ==================================================================
  // CONFIGURACIÓN
  // ==================================================================

  private readonly API_URL = environment.apiUrl;
  private readonly CONVOCATORIAS_URL = `${this.API_URL}/convocatorias`;
  private readonly DOCUMENTS_URL = `${this.API_URL}/documents`;

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
  // SUBIDA DE DOCUMENTOS
  // ==================================================================

  /**
   * Sube un archivo con seguimiento de progreso.
   * @param file Archivo a subir
   * @returns Observable con eventos HTTP (incluye progreso)
   */
  uploadDocument(file: File): Observable<HttpEvent<DocumentUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<DocumentUploadResponse>(
      `${this.DOCUMENTS_URL}/upload`,
      formData,
      {
        headers: this.getHeaders(),
        reportProgress: true,
        observe: 'events',
        responseType: 'json'
      }
    );
  }

  /**
   * Sube múltiples archivos en una sola petición.
   * @param files Array de archivos
   * @returns Observable con respuestas del servidor
   */
  uploadMultipleDocuments(files: File[]): Observable<DocumentUploadResponse[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    return this.http.post<DocumentUploadResponse[]>(
      `${this.DOCUMENTS_URL}/upload-multiple`,
      formData,
      { headers: this.getHeaders() }
    );
  }

  // ==================================================================
  // DESCARGA DE DOCUMENTOS
  // ==================================================================

  /**
   * Descarga un documento como Blob.
   * @param documentId ID del documento
   * @returns Observable con el archivo
   */
  downloadDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.DOCUMENTS_URL}/${documentId}/download`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  /**
   * Descarga un documento de una convocatoria específica.
   * @param convId ID de la convocatoria
   * @param docId ID del documento
   * @returns Observable con el archivo
   */
  downloadDocumentConvocatorias(convId: string, docId: string): Observable<Blob> {
    const url = `${this.CONVOCATORIAS_URL}/${convId}/documents/${docId}/download`;
    return this.http.get<Blob>(url, {
      headers: this.getHeaders(),
      responseType: 'blob' as 'json'
    });
  }

  /**
   * Dispara la descarga de un Blob en el navegador.
   * @param blob Archivo descargado
   * @param fileName Nombre del archivo
   */
  triggerDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'archivo';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // ==================================================================
  // INFORMACIÓN Y ELIMINACIÓN
  // ==================================================================

  /**
   * Obtiene metadatos de un documento.
   * @param documentId ID del documento
   */
  getDocumentInfo(documentId: number): Observable<DocumentUploadResponse> {
    return this.http.get<DocumentUploadResponse>(
      `${this.DOCUMENTS_URL}/${documentId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Elimina un documento del sistema.
   * @param documentId ID del documento
   */
  deleteDocument(documentId: number): Observable<any> {
    return this.http.delete(`${this.DOCUMENTS_URL}/${documentId}`, {
      headers: this.getHeaders()
    });
  }

  // ==================================================================
  // VALIDACIÓN DE ARCHIVOS
  // ==================================================================

  /**
   * Verifica si el tipo MIME está permitido.
   * Soporta comodines como `image/*`.
   * @param file Archivo
   * @param allowedTypes Tipos permitidos (ej: ['application/pdf', 'image/*'])
   */
  isFileTypeAllowed(file: File, allowedTypes: string[] = []): boolean {
    if (allowedTypes.length === 0) return true;
    return allowedTypes.some(type => {
      if (type.includes('*')) {
        const [mainType] = type.split('/');
        const [fileMainType] = file.type.split('/');
        return mainType === '*' || mainType === fileMainType;
      }
      return file.type === type;
    });
  }

  /**
   * Verifica si el tamaño está dentro del límite.
   * @param file Archivo
   * @param maxSizeMB Tamaño máximo en MB (por defecto 50)
   */
  isFileSizeValid(file: File, maxSizeMB = 50): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  // ==================================================================
  // PROGRESO DE SUBIDA
  // ==================================================================

  /**
   * Extrae progreso de un evento HTTP.
   * @param event Evento HTTP
   * @returns Progreso o `null`
   */
  extractUploadProgress(event: HttpEvent<any>): UploadProgress | null {
    if (event.type === HttpEventType.UploadProgress) {
      const uploadEvent = event as HttpUploadProgressEvent;
      return {
        progress: uploadEvent.total
          ? Math.round((100 * uploadEvent.loaded) / uploadEvent.total)
          : 0,
        loaded: uploadEvent.loaded ?? 0,
        total: uploadEvent.total ?? 0
      };
    }
    return null;
  }

  // ==================================================================
  // UTILIDADES DE ARCHIVOS
  // ==================================================================

  /**
   * Convierte archivo a Base64.
   * @param file Archivo
   * @returns Promise con string Base64
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Obtiene la extensión del archivo.
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
      xls: 'Excel',
      xlsx: 'Excel',
      ppt: 'PowerPoint',
      pptx: 'PowerPoint',
      txt: 'Texto',
      jpg: 'Imagen',
      jpeg: 'Imagen',
      png: 'Imagen',
      zip: 'Comprimido',
      rar: 'Comprimido'
    };
    return typeMap[extension] || 'Archivo';
  }
}