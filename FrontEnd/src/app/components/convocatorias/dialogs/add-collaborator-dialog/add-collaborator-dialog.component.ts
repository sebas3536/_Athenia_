// add-collaborator-dialog.component.ts

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { User } from 'src/app/domain/models/user.model';
import { CollaboratorRole } from 'src/app/domain/models/convocatorias.model';
import { ProfileAvatar } from '@shared/components/profile-avatar/profile-avatar';

/**
 * Datos emitidos al agregar colaboradores.
 */
export interface AddCollaboratorData {
  userIds: number[];
  role: CollaboratorRole;
}

/**
 * Diálogo modal para agregar colaboradores a una convocatoria.
 * Permite seleccionar múltiples usuarios y asignarles un rol.
 */
@Component({
  selector: 'app-add-collaborator-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ProfileAvatar],
  templateUrl: './add-collaborator-dialog.component.html',
})
export class AddCollaboratorDialogComponent {
  // ==================================================================
  // INPUTS
  // ==================================================================

  /** Controla la visibilidad del diálogo */
  @Input() open = false;

  /** Indica si está en proceso de carga (deshabilita interacciones) */
  @Input() isLoading = false;

  /** Lista de usuarios disponibles para agregar */
  @Input() availableUsers: User[] = [];

  // ==================================================================
  // OUTPUTS
  // ==================================================================

  /** Emite cuando cambia el estado de apertura */
  @Output() openChange = new EventEmitter<boolean>();

  /** Emite los datos al confirmar la adición de colaboradores */
  @Output() addCollaborators = new EventEmitter<AddCollaboratorData>();

  // ==================================================================
  // ESTADO LOCAL
  // ==================================================================

  /** IDs de usuarios seleccionados */
  selectedUserIds = new Set<number>();

  /** Rol seleccionado para los nuevos colaboradores */
  selectedRole: CollaboratorRole = 'editor';

  /** Muestra errores de validación */
  showErrors = false;

  // ==================================================================
  // GESTIÓN DEL DIÁLOGO
  // ==================================================================

  /**
   * Cierra el diálogo y resetea el formulario.
   */
  close(): void {
    if (this.isLoading) return;

    this.open = false;
    this.openChange.emit(false);
    this.reset();
  }

  /**
   * Resetea el formulario a su estado inicial.
   */
  private reset(): void {
    this.selectedUserIds.clear();
    this.selectedRole = 'editor';
    this.showErrors = false;
  }

  // ==================================================================
  // SELECCIÓN DE USUARIOS
  // ==================================================================

  /**
   * Alterna la selección de un usuario.
   */
  toggleUser(userId: number): void {
    if (this.selectedUserIds.has(userId)) {
      this.selectedUserIds.delete(userId);
    } else {
      this.selectedUserIds.add(userId);
    }
  }

  /**
   * Verifica si un usuario está seleccionado.
   */
  isUserSelected(userId: number): boolean {
    return this.selectedUserIds.has(userId);
  }

  /**
   * Devuelve la lista de usuarios seleccionados.
   */
  get selectedUsersArray(): User[] {
    return this.availableUsers.filter(user => this.selectedUserIds.has(user.id));
  }

  // ==================================================================
  // ENVÍO DEL FORMULARIO
  // ==================================================================

  /**
   * Valida y envía los datos de los colaboradores seleccionados.
   */
  onSubmit(): void {
    if (this.selectedUserIds.size === 0) {
      this.showErrors = true;
      return;
    }

    this.addCollaborators.emit({
      userIds: Array.from(this.selectedUserIds),
      role: this.selectedRole
    });

  }

  // ==================================================================
  // UTILIDADES DE UI
  // ==================================================================

  /**
   * Devuelve la descripción legible del rol seleccionado.
   */
  getRoleDescription(role: CollaboratorRole): string {
    const descriptions: Record<CollaboratorRole, string> = {
      editor: 'Puede ver y subir documentos en la convocatoria',
      admin: 'Puede gestionar completamente la convocatoria, incluyendo colaboradores'
    };
    return descriptions[role];
  }

  // ==================================================================
  // MANEJADORES DE EVENTOS DE INTERACCIÓN
  // ==================================================================

  /**
   * Cierra el diálogo al hacer clic en el fondo (backdrop).
   */
  onBackdropClick(): void {
    if (!this.isLoading) {
      this.close();
    }
  }

  /**
   * Evita que el clic dentro del diálogo cierre el modal.
   */
  onDialogClick(event: Event): void {
    event.stopPropagation();
  }

  /**
   * Cierra el diálogo con la tecla Escape.
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !this.isLoading) {
      this.close();
    }
  }
}