/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/features/convocatorias/utils/role.utils.ts

import { Injectable } from '@angular/core';
import { CollaboratorRole, ROLE_DESCRIPTIONS } from 'src/app/domain/models/convocatorias.model';

@Injectable({
  providedIn: 'root'
})
export class RoleUtilsService {

  /**
   * Obtiene el label traducido de un rol
   * @param role - El rol
   * @returns String traducido
   */
  getRoleLabel(role: CollaboratorRole | string): string {
    const labels: Record<string, string> = {
      'viewer': 'Visualizador',
      'editor': 'Editor',
      'admin': 'Administrador'
    };
    return labels[role] || role;
  }

  /**
   * Obtiene las clases CSS para el badge de un rol
   * @param role - El rol
   * @returns String con clases Tailwind
   */
  getRoleBadgeClass(role: CollaboratorRole | string): string {
    const classes: Record<string, string> = {
      'viewer': 'bg-blue-100 text-blue-800 border-blue-300',
      'editor': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'admin': 'bg-green-100 text-green-800 border-green-300'
    };
    return classes[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  }

  /**
   * Obtiene el icono de un rol
   * @param role - El rol
   * @returns Nombre del icono Lucide
   */
  getRoleIcon(role: CollaboratorRole | string): string {
    const icons: Record<string, string> = {
      'viewer': 'Eye',
      'editor': 'Edit',
      'admin': 'Shield'
    };
    return icons[role] || 'User';
  }

  /**
   * Obtiene la descripción de un rol
   * @param role - El rol
   * @returns Descripción del rol
   */
  getRoleDescription(role: CollaboratorRole | string): string {
    return ROLE_DESCRIPTIONS[role as CollaboratorRole] || '';
  }

  /**
   * Obtiene el color de fondo para avatar según rol
   * @param role - El rol
   * @returns String con color
   */
  getRoleAvatarColor(role: CollaboratorRole | string): string {
    const colors: Record<string, string> = {
      'viewer': 'from-blue-500 to-blue-700',
      'editor': 'from-yellow-500 to-yellow-700',
      'admin': 'from-green-500 to-green-700'
    };
    return colors[role] || 'from-gray-500 to-gray-700';
  }

  /**
   * Valida si un rol es válido
   * @param role - El rol a validar
   * @returns boolean
   */
  isValidRole(role: any): role is CollaboratorRole {
    return ['viewer', 'editor', 'admin'].includes(role);
  }

  /**
   * Obtiene la jerarquía de un rol (admin > editor > viewer)
   * @param role - El rol
   * @returns Número de 0-2
   */
  getRoleHierarchy(role: CollaboratorRole | string): number {
    const hierarchy: Record<string, number> = {
      'viewer': 0,
      'editor': 1,
      'admin': 2
    };
    return hierarchy[role] || -1;
  }

  /**
   * Compara dos roles y retorna cuál es mayor
   * @param role1 - Primer rol
   * @param role2 - Segundo rol
   * @returns El rol con mayor jerarquía
   */
  getHigherRole(role1: CollaboratorRole, role2: CollaboratorRole): CollaboratorRole {
    const h1 = this.getRoleHierarchy(role1);
    const h2 = this.getRoleHierarchy(role2);
    return h1 >= h2 ? role1 : role2;
  }

  /**
   * Verifica si un rol tiene permiso para una acción específica
   * @param role - El rol
   * @param action - La acción (view, edit, delete, manage)
   * @returns boolean
   */
  hasPermission(role: CollaboratorRole | string, action: string): boolean {
    const permissions: Record<string, string[]> = {
      'viewer': ['view'],
      'editor': ['view', 'edit', 'delete'],
      'admin': ['view', 'edit', 'delete', 'manage']
    };

    return (permissions[role] || []).includes(action);
  }

  /**
   * Obtiene lista de roles disponibles
   * @returns Array de roles
   */
  getAvailableRoles(): CollaboratorRole[] {
    return ['editor', 'admin'];
  }

  /**
   * Obtiene lista de roles disponibles para cambio (respetando jerarquía actual)
   * @param currentRole - Rol actual del usuario
   * @returns Array de roles que puede asignar
   */
  getAssignableRoles(currentRole: CollaboratorRole): CollaboratorRole[] {
    const hierarchy = this.getRoleHierarchy(currentRole);
    
    if (hierarchy < 2) {
      // Si no es admin, solo puede asignar roles inferiores
      return this.getAvailableRoles().filter(r => 
        this.getRoleHierarchy(r) <= hierarchy
      );
    }
    
    // Admin puede asignar todos los roles
    return this.getAvailableRoles();
  }

  /**
   * Genera un objeto con información completa de un rol
   * @param role - El rol
   * @returns Objeto con información del rol
   */
  getRoleInfo(role: CollaboratorRole | string): {
    label: string;
    description: string;
    icon: string;
    badge: string;
    hierarchy: number;
  } {
    return {
      label: this.getRoleLabel(role),
      description: this.getRoleDescription(role),
      icon: this.getRoleIcon(role),
      badge: this.getRoleBadgeClass(role),
      hierarchy: this.getRoleHierarchy(role)
    };
  }
}