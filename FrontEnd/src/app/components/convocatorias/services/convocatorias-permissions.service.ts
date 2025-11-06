/* eslint-disable @angular-eslint/prefer-inject */
import { Injectable } from '@angular/core';
import { ConvocatoriasAccessService } from './convocatorias-access.service';
import { Auth } from '../../authentication/auth/auth';

/**
 * Permisos del usuario sobre una convocatoria específica.
 */
export interface ConvocatoriaPermissions {
  /** ¿Puede crear nuevas convocatorias? */
  canCreate: boolean;
  /** ¿Puede editar información de la convocatoria? */
  canEdit: boolean;
  /** ¿Puede eliminar la convocatoria? */
  canDelete: boolean;
  /** ¿Puede agregar colaboradores? */
  canAddCollaborators: boolean;
  /** ¿Puede remover colaboradores? */
  canRemoveCollaborators: boolean;
  /** ¿Puede crear ítems del checklist? */
  canCreateChecklistItems: boolean;
  /** ¿Puede eliminar ítems del checklist? */
  canDeleteChecklistItems: boolean;
  /** ¿Puede subir documentos? */
  canUploadDocuments: boolean;
  /** ¿Puede ver documentos? */
  canViewDocuments: boolean;
}

/**
 * Servicio para evaluar permisos del usuario en convocatorias.
 * Basado en rol global y asignación como colaborador.
 */
@Injectable({
  providedIn: 'root'
})
export class ConvocatoriasPermissionsService {
  // ==================================================================
  // PERMISOS POR ROL
  // ==================================================================

  /** Permisos completos para administradores */
  private readonly ADMIN_PERMISSIONS: ConvocatoriaPermissions = {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canAddCollaborators: true,
    canRemoveCollaborators: true,
    canCreateChecklistItems: true,
    canDeleteChecklistItems: true,
    canUploadDocuments: true,
    canViewDocuments: true
  };

  /** Permisos limitados para colaboradores asignados */
  private readonly COLLABORATOR_PERMISSIONS: ConvocatoriaPermissions = {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canAddCollaborators: false,
    canRemoveCollaborators: false,
    canCreateChecklistItems: false,
    canDeleteChecklistItems: false,
    canUploadDocuments: true,
    canViewDocuments: true
  };

  /** Sin permisos (por defecto) */
  private readonly NO_PERMISSIONS: ConvocatoriaPermissions = {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canAddCollaborators: false,
    canRemoveCollaborators: false,
    canCreateChecklistItems: false,
    canDeleteChecklistItems: false,
    canUploadDocuments: false,
    canViewDocuments: false
  };

  // ==================================================================
  // CONSTRUCTOR
  // ==================================================================

  constructor(
    private accessService: ConvocatoriasAccessService,
    private authService: Auth
  ) {}

  // ==================================================================
  // EVALUACIÓN DE PERMISOS
  // ==================================================================

  /**
   * Obtiene los permisos completos del usuario para una convocatoria.
   * @param convocatoriaId ID de la convocatoria (opcional)
   * @returns Objeto con todos los permisos
   */
  getPermissions(convocatoriaId?: number): ConvocatoriaPermissions {
    const access = this.accessService.getCurrentAccess();

    const isAdmin = access?.isAdmin ?? false;
    const isCollaborator = access?.isCollaborator ?? false;
    const isAssigned = convocatoriaId
      ? access?.convocatoriaIds.includes(convocatoriaId) ?? false
      : false;

    if (isAdmin) {
      return this.ADMIN_PERMISSIONS;
    }

    if (isCollaborator && isAssigned) {
      return this.COLLABORATOR_PERMISSIONS;
    }

    return this.NO_PERMISSIONS;
  }

  /**
   * Verifica si el usuario puede realizar una acción específica.
   * @param action Nombre de la acción (clave del permiso)
   * @param convocatoriaId ID de la convocatoria (opcional)
   * @returns `true` si tiene permiso
   */
  can(action: keyof ConvocatoriaPermissions, convocatoriaId?: number): boolean {
    const permissions = this.getPermissions(convocatoriaId);
    return permissions[action] ?? false;
  }
}