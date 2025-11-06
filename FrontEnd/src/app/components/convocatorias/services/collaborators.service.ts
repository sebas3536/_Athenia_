/* eslint-disable @angular-eslint/prefer-inject */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/features/convocatorias/services/collaborators.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { Collaborator, User } from 'src/app/domain/models/convocatorias.model';
import { AuthHeaderService } from 'src/app/services/api/auth-header.service';
import { environment } from 'src/environments/environment.development';

/**
 * Respuesta del backend para colaboradores.
 */
interface CollaboratorResponse {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role: string;
  added_at: string;
}

/**
 * Respuesta del backend para usuarios.
 */
interface UserResponse {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

/**
 * Servicio para gestionar colaboradores de convocatorias.
 * Maneja CRUD de colaboradores, filtrado y transformación de datos del backend.
 */
@Injectable({
  providedIn: 'root',
})
export class CollaboratorsService {
  // ==================================================================
  // CONFIGURACIÓN DE URLs
  // ==================================================================

  private readonly API_URL = environment.apiUrl;
  private readonly CONVOCATORIAS_URL = `${this.API_URL}/convocatorias`;
  private readonly USERS_URL = `${this.API_URL}/users`;

  // ==================================================================
  // CONSTRUCTOR
  // ==================================================================

  constructor(private http: HttpClient, private authHeaderService: AuthHeaderService) {}

  // ==================================================================
  // MÉTODOS PRIVADOS DE UTILIDAD
  // ==================================================================

  /** Obtiene headers de autenticación */
  private getHeaders() {
    return this.authHeaderService.getAuthHeaders();
  }

  /**
   * Transforma respuesta del backend en modelo `Collaborator`.
   */
  private parseCollaborator(data: CollaboratorResponse): Collaborator {
    return {
      id: String(data.id),
      name: data.user_name,
      email: data.user_email,
      role: data.role as 'admin' | 'editor',
      avatar: data.user_name.substring(0, 2).toUpperCase(),
      addedAt: new Date(data.added_at),
    };
  }

  /**
   * Transforma respuesta del backend en modelo `User`.
   */
  private parseUser(data: UserResponse): User {
    return {
      id: String(data.id),
      name: data.name,
      email: data.email,
      avatar: data.avatar || data.name.substring(0, 2).toUpperCase(),
    };
  }

  // ==================================================================
  // OPERACIONES CRUD DE COLABORADORES
  // ==================================================================

  /**
   * Obtiene la lista de colaboradores de una convocatoria.
   * @param convId ID de la convocatoria
   */
  getCollaborators(convId: string): Observable<Collaborator[]> {
    return this.http
      .get<CollaboratorResponse[]>(`${this.CONVOCATORIAS_URL}/${convId}/collaborators`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((collaborators: CollaboratorResponse[]) =>
          collaborators.map((c) => this.parseCollaborator(c))
        ),
        catchError((error) => {
          console.error('Error loading collaborators:', error);
          throw error;
        })
      );
  }

  /**
   * Agrega múltiples colaboradores a una convocatoria.
   * @param convId ID de la convocatoria
   * @param userIds IDs de usuarios a agregar
   * @param role Rol a asignar ('admin' | 'editor')
   */
  addCollaborators(
    convId: string,
    userIds: number[],
    role: 'admin' | 'editor' = 'editor'
  ): Observable<any> {
    const payload = { user_ids: userIds, role };

    return this.http
      .post(`${this.CONVOCATORIAS_URL}/${convId}/collaborators`, payload, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Error adding collaborators:', error);
          throw error;
        })
      );
  }

  /**
   * Elimina un colaborador de una convocatoria.
   * @param convId ID de la convocatoria
   * @param collaboratorId ID del colaborador
   */
  removeCollaborator(convId: string, collaboratorId: string): Observable<any> {
    return this.http
      .delete(`${this.CONVOCATORIAS_URL}/${convId}/collaborators/${collaboratorId}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Error removing collaborator:', error);
          throw error;
        })
      );
  }

  /**
   * Actualiza el rol de un colaborador.
   * @param convId ID de la convocatoria
   * @param collaboratorId ID del colaborador
   * @param newRole Nuevo rol ('admin' | 'editor')
   */
  updateCollaboratorRole(
    convId: string,
    collaboratorId: string,
    newRole: 'admin' | 'editor'
  ): Observable<any> {
    const payload = { role: newRole };

    return this.http
      .patch(`${this.CONVOCATORIAS_URL}/${convId}/collaborators/${collaboratorId}`, payload, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Error updating collaborator role:', error);
          throw error;
        })
      );
  }

  // ==================================================================
  // OPERACIONES DE USUARIOS
  // ==================================================================

  /**
   * Obtiene usuarios disponibles para agregar como colaboradores.
   */
  getAvailableUsers(): Observable<User[]> {
    return this.http
      .get<UserResponse[]>(`${this.USERS_URL}/available`, { headers: this.getHeaders() })
      .pipe(
        map((users: UserResponse[]) => users.map((u) => this.parseUser(u))),
        catchError((error) => {
          console.error('Error loading available users:', error);
          throw error;
        })
      );
  }

  // ==================================================================
  // UTILIDADES DE FILTRADO
  // ==================================================================

  /**
   * Filtra usuarios excluyendo los que ya son colaboradores.
   * @param users Lista completa de usuarios
   * @param collaborators Lista de colaboradores actuales
   */
  filterOutExistingCollaborators(users: User[], collaborators: Collaborator[]): User[] {
    const collaboratorEmails = new Set(collaborators.map((c) => c.email));
    return users.filter((u) => !collaboratorEmails.has(u.email));
  }
}
