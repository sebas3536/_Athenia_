/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @angular-eslint/prefer-inject */

import { Injectable } from '@angular/core';
import { ActivityLog, ChartDataPoint, DashboardStats, DocumentUploadResponse, DocumentWithMetadata, PaginatedDocumentsResponse, StorageStats, UserSummary } from '../../domain/models/document.model';
import { catchError, map, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Auth as AuthService } from '../../components/authentication/auth/auth';
import { AuthHeaderService } from './auth-header.service';

@Injectable({
  providedIn: 'root'
})
export class Api {

  private readonly API_URL = 'http://127.0.0.1:8000'
  private readonly DOCUMENTS_URL = `${this.API_URL}/documents`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private authHeaderService: AuthHeaderService
  ) { }

  /**
   * Maneja los errores de las peticiones HTTP.
   * @param error El objeto de error HTTP.
   * @returns Un observable con el error.
  **/
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido. Por favor, inténtalo de nuevo.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      errorMessage = `Error del servidor: ${error.status} - ${error.message}`;
      if (error.status === 401) {
        errorMessage = 'Credenciales incorrectas o token inválido.';
      } else if (error.status === 403) {
        errorMessage = 'No tienes permisos para realizar esta acción.';
      } else if (error.status === 404) {
        errorMessage = 'Recurso no encontrado.';
      }
    }
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Uploads multiple documents to the server
   * @param files Array of files to upload
   * @returns Observable with upload results
  **/
  uploadDocuments(files: File[]): Observable<DocumentUploadResponse> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file, file.name));
    const headers = this.authHeaderService.getAuthHeaders().delete('Content-Type');

    return this.http.post<DocumentUploadResponse>(`${this.DOCUMENTS_URL}/upload`, formData, { headers })
      .pipe(catchError(this.handleError));
  }

  /**
   * Downloads a specific document
   * @param docId Document ID
   * @returns Observable with the document as a Blob
  **/
  downloadDocument(docId: number): Observable<Blob> {
    return this.http.get(`${this.DOCUMENTS_URL}/download/${docId}`, {
      headers: this.authHeaderService.getAuthHeaders(),
      responseType: 'blob'
    }).pipe(catchError(this.handleError));
  }

  /**
   * Gets metadata for a specific document
   * @param docId Document ID
   * @returns Observable with document metadata
  **/
  getDocumentMetadata(docId: number): Observable<Document> {
    return this.http.get<Document>(`${this.DOCUMENTS_URL}/${docId}/metadata`, {
      headers: this.authHeaderService.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  /**
   * Gets metadata for all documents
   * @param includeAllUsers Include documents from all users (admin only)
   * @returns Observable with array of document metadata
  **/
  getAllDocumentsMetadata(includeAllUsers = true): Observable<DocumentWithMetadata[]> {
    const params = new HttpParams().set('include_all_users', includeAllUsers.toString());
    return this.http.get<any[]>(`${this.DOCUMENTS_URL}/metadata/all`, {
      headers: this.authHeaderService.getAuthHeaders(),
      params
    }).pipe(
      catchError(this.handleError),
      map((documents) =>
        documents.map(doc => ({
          ...doc,
          filename: doc.filename ?? doc.name
        }))
      )
    );
  }


  /**
   * Gets dashboard statistics
   * @param includeAllUsers Include stats from all users (admin only)
   * @returns Observable with dashboard statistics
  **/
  getDashboardStats(includeAllUsers = false): Observable<DashboardStats> {
    const params = new HttpParams().set('include_all_users', includeAllUsers.toString());
    return this.http.get<DashboardStats>(`${this.DOCUMENTS_URL}/stats/dashboard`, {
      headers: this.authHeaderService.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  /**
   * Gets chart data for document activity
   * @param period Time period for chart data (week, month, or year)
   * @param includeAllUsers Include data from all users (admin only)
   * @returns Observable with chart data points
  **/
  getChartData(period: 'week' | 'month' | 'year' = 'month', includeAllUsers = false): Observable<ChartDataPoint[]> {
    const params = new HttpParams()
      .set('period', period)
      .set('include_all_users', includeAllUsers.toString());



    return this.http.get<ChartDataPoint[]>(`${this.DOCUMENTS_URL}/stats/charts`, {
      headers: this.authHeaderService.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  /**
     * Gets recent document activities
     * @param limit Maximum number of activities (1-100)
     * @param includeAllUsers Include activities from all users (admin only)
     * @returns Observable with recent activities
  **/
  getRecentActivities(limit = 20, includeAllUsers = false): Observable<ActivityLog[]> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('include_all_users', includeAllUsers.toString());
    return this.http.get<ActivityLog[]>(`${this.DOCUMENTS_URL}/activities/recent`, {
      headers: this.authHeaderService.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  /**
   * Gets storage statistics for a user
   * @param targetUserId User ID (admin only for other users)
   * @returns Observable with storage statistics
  **/
  getUserStorageStats(targetUserId?: number): Observable<StorageStats> {
    let params = new HttpParams();
    if (targetUserId !== undefined) {
      params = params.set('target_user_id', targetUserId.toString());
    }
    return this.http.get<StorageStats>(`${this.DOCUMENTS_URL}/stats/storage`, {
      headers: this.authHeaderService.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }

  /**
   * Gets comprehensive user summary metrics
   * @returns Observable with user summary
  **/
  getUserSummary(): Observable<UserSummary> {
    return this.http.get<UserSummary>(`${this.DOCUMENTS_URL}/stats/summary`, {
      headers: this.authHeaderService.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  /**
   * Searches documents with advanced filters
   * @param text Search text for content and filename
   * @param fileType Filter by file type
   * @param skip Number of documents to skip
   * @param limit Maximum number of documents to return
   * @returns Observable with paginated document search results
  **/
  searchDocuments(
    text?: string,
    fileType?: DocumentType,
    skip = 0,
    limit = 20,
    dateFrom?: string,
    dateTo?: string
  ): Observable<PaginatedDocumentsResponse> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    if (text && text.trim().length >= 2) {
      params = params.set('text', text.trim());
    }

    if (fileType) {
      params = params.set('file_type', fileType.toString());
    }

    if (dateFrom) {
      params = params.set('date_from', dateFrom);
    }

    if (dateTo) {
      params = params.set('date_to', dateTo);
    }

    return this.http.get<PaginatedDocumentsResponse>(
      `${this.DOCUMENTS_URL}/search`,
      {
        headers: this.authHeaderService.getAuthHeaders(),
        params
      }
    ).pipe(
      catchError(this.handleError)
    );
  }




  /**
   * Deletes a specific document
   * @param docId Document ID
   * @returns Observable with void response
   */
  deleteDocument(docId: number): Observable<void> {
    return this.http.delete<void>(`${this.DOCUMENTS_URL}/${docId}`, {
      headers: this.authHeaderService.getAuthHeaders()
    }).pipe(catchError(this.handleError));
  }

  /**
   * Gets paginated list of user documents
   * @param skip Number of documents to skip
   * @param limit Maximum number of documents to return
   * @param fileType Filter by file type
   * @returns Observable with paginated documents
   */
  getDocuments(skip = 0, limit = 20, fileType?: DocumentType): Observable<PaginatedDocumentsResponse> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    if (fileType) {
      params = params.set('file_type', fileType.toString());
    }
    return this.http.get<PaginatedDocumentsResponse>(this.DOCUMENTS_URL, {
      headers: this.authHeaderService.getAuthHeaders(),
      params
    }).pipe(catchError(this.handleError));
  }


  /**
   * Checks document service health
   * @returns Observable with health status
   */
  checkHealth(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.DOCUMENTS_URL}/health`)
      .pipe(catchError(this.handleError));
  }

  /*** Document Operations ***/

  /**
   * Lista los documentos del usuario autenticado.
   * @param options Opciones de paginación y filtrado.
   * @returns Un observable con la lista de documentos paginados.
   **/
  listDocuments(options?: { skip?: number; limit?: number; fileType?: string; text?: string }): Observable<PaginatedDocumentsResponse> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams()
      .set('skip', (options?.skip ?? 0).toString())
      .set('limit', (options?.limit ?? 20).toString());

    if (options?.fileType) {
      params = params.set('file_type', options.fileType);
    }

    if (options?.text) {
      params = params.set('text', options.text);
    }

    return this.http.get<PaginatedDocumentsResponse>(this.DOCUMENTS_URL, { headers, params }).pipe(catchError(this.handleError));
  }

  /**
   * Obtiene los metadatos de un documento por su ID.
   * @param docId ID del documento.
   * @returns Metadatos del documento.
   **/
  getDocumentsMetadata(docId: number): Observable<DocumentWithMetadata[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<DocumentWithMetadata[]>(`${this.DOCUMENTS_URL}/${docId}/metadata`, { headers }).pipe(catchError(this.handleError));
  }

  /**
   * Obtiene el header de autenticación.
   **/
  private getAuthHeaders(): HttpHeaders {
    return this.authHeaderService.getAuthHeaders();
  }
}