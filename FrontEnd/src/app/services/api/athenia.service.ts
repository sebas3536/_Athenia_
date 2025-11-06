/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/services/athenia/athenia.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthHeaderService } from './auth-header.service';
import { environment } from 'src/environments/environment.development';

/**
 * Solicitud para consultar a ATHENIA.
 */
export interface AtheniaQueryRequest {
  question: string;
  document_ids?: number[];
  use_cache?: boolean;
}

/**
 * Respuesta de ATHENIA.
 */
export interface AtheniaResponse {
  answer: string;
  confidence: number;
  sources: number[];
  from_cache: boolean;
  processing_time_ms: number;
  conversation_id: number;
}

/**
 * Estado del sistema ATHENIA.
 */
export interface AtheniaStatus {
  is_ready: boolean;
  documents_indexed: number;
  cache_size: number;
  semantic_cache_size?: number;
  cache_hit_rate?: number;
  last_sync: string | null;
  vector_db_size_mb: number;
}

/**
 * Mensaje en una conversación con ATHENIA.
 */
export interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: number[];
  confidence?: number;
  from_cache?: boolean;
}

/**
 * Servicio para interactuar con ATHENIA (asistente IA).
 * Soporta consultas, historial, caché y sincronización.
 */
@Injectable({
  providedIn: 'root'
})
export class AtheniaService {
  // ==================================================================
  // CONFIGURACIÓN
  // ==================================================================

 private readonly API_URL = environment.apiUrl;
  private readonly BASE_URL = `${this.API_URL}/assistant`;

  // ==================================================================
  // SERVICIOS
  // ==================================================================

  private http = inject(HttpClient);
  private authHeaderService = inject(AuthHeaderService);

  // ==================================================================
  // MÉTODOS PRIVADOS
  // ==================================================================

  /** Obtiene headers de autenticación */
  private getHeaders() {
    return this.authHeaderService.getAuthHeaders();
  }

  /** Maneja errores HTTP */
  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }

  // ==================================================================
  // CONSULTAS
  // ==================================================================

  /**
   * Realiza una pregunta a ATHENIA.
   * @param request Datos de la consulta
   * @returns Respuesta del asistente
   */
  askQuestion(request: AtheniaQueryRequest): Observable<AtheniaResponse> {
    return this.http.post<AtheniaResponse>(
      `${this.BASE_URL}/query`,
      request,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  // ==================================================================
  // ESTADO DEL SISTEMA
  // ==================================================================

  /**
   * Obtiene el estado actual de ATHENIA.
   * @returns Estado del sistema
   */
  getStatus(): Observable<AtheniaStatus> {
    return this.http.get<AtheniaStatus>(
      `${this.BASE_URL}/status`,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  // ==================================================================
  // HISTORIAL
  // ==================================================================

  /**
   * Obtiene el historial de conversaciones.
   * @param conversationId ID de conversación (opcional)
   * @param limit Número máximo de mensajes
   * @returns Lista de mensajes
   */
  getHistory(conversationId?: number, limit = 50): Observable<ConversationMessage[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (conversationId) {
      params = params.set('conversation_id', conversationId.toString());
    }

    return this.http.get<ConversationMessage[]>(
      `${this.BASE_URL}/history`,
      { headers: this.getHeaders(), params }
    ).pipe(catchError(this.handleError));
  }

  // ==================================================================
  // GESTIÓN DE CACHÉ
  // ==================================================================

  /**
   * Limpia el caché de respuestas de ATHENIA.
   * @returns Confirmación del servidor
   */
  clearCache(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.BASE_URL}/cache`,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  /**
   * Obtiene estadísticas del caché.
   * @returns Métricas de rendimiento
   */
  getCacheStats(): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/cache/stats`,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  // ==================================================================
  // SINCRONIZACIÓN
  // ==================================================================

  /**
   * Sincroniza documentos con el índice de ATHENIA.
   * @param documentIds IDs de documentos a sincronizar (opcional)
   * @param forceReindex Forzar reindexación completa
   * @returns Estado de la operación
   */
  syncDocuments(documentIds?: number[], forceReindex = false): Observable<any> {
    const payload = {
      document_ids: documentIds,
      force_reindex: forceReindex
    };

    return this.http.post(
      `${this.BASE_URL}/documents/sync`,
      payload,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }
}