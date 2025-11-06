// src/app/features/convocatorias/dialogs/create-convocatoria-dialog/create-convocatoria-dialog.component.ts

import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CreateConvocatoriaData } from 'src/app/domain/models/convocatorias.model';

/**
 * Diálogo modal para crear una nueva convocatoria.
 * Permite ingresar nombre, descripción y fechas de inicio/fin.
 */
@Component({
  selector: 'app-create-convocatoria-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './create-convocatoria-dialog.component.html',
  styleUrl: './create-convocatoria-dialog.component.css'
})
export class CreateConvocatoriaDialogComponent implements OnChanges {
  // ==================================================================
  // INPUTS
  // ==================================================================

  /** Controla la visibilidad del diálogo */
  @Input() open = false;

  /** Indica si está en proceso de carga (deshabilita interacciones) */
  @Input() isLoading = false;

  // ==================================================================
  // OUTPUTS
  // ==================================================================

  /** Emite cuando cambia el estado de apertura */
  @Output() openChange = new EventEmitter<boolean>();

  /** Emite los datos al confirmar la creación de la convocatoria */
  @Output() create = new EventEmitter<CreateConvocatoriaData>();

  // ==================================================================
  // ESTADO DEL FORMULARIO
  // ==================================================================

  /** Nombre de la convocatoria */
  name = '';

  /** Descripción de la convocatoria */
  description = '';

  /** Fecha de inicio (string en formato ISO/local) */
  startDate = '';

  /** Fecha de fin (string en formato ISO/local) */
  endDate = '';

  /** Muestra errores de validación */
  showErrors = false;

  // ==================================================================
  // LIFECYCLE HOOKS
  // ==================================================================

  /**
   * Detecta cambios en `@Input open` y resetea el formulario al abrir el diálogo.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetForm();
    }
  }

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
    this.resetForm();
  }

  /**
   * Resetea todos los campos del formulario a su estado inicial.
   */
  private resetForm(): void {
    this.name = '';
    this.description = '';
    this.startDate = '';
    this.endDate = '';
    this.showErrors = false;
  }

  // ==================================================================
  // ENVÍO DEL FORMULARIO
  // ==================================================================

  /**
   * Valida y envía los datos de la nueva convocatoria.
   * El nombre es obligatorio. Las fechas son opcionales.
   */
  onSubmit(): void {
    if (!this.name.trim()) {
      this.showErrors = true;
      return;
    }

    const data: CreateConvocatoriaData = {
      name: this.name.trim(),
      description: this.description.trim(),
      startDate: this.startDate ? new Date(this.startDate) : undefined,
      endDate: this.endDate ? new Date(this.endDate) : undefined
    };

    this.create.emit(data);
    this.close();
  }

  // ==================================================================
  // INTERACCIÓN CON UI
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

  // ==================================================================
  // GETTERS (para uso en template)
  // ==================================================================

  /** Indica si el campo nombre es inválido y debe mostrar error */
  get isNameInvalid(): boolean {
    return this.showErrors && !this.name.trim();
  }

  /** Habilita el botón de envío solo si hay nombre válido y no está cargando */
  get canSubmit(): boolean {
    return !!this.name.trim() && !this.isLoading;
  }
}