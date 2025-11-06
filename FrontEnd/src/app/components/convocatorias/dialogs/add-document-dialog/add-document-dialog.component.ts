// src/app/features/convocatorias/dialogs/add-document-dialog/add-document-dialog.component.ts

import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Datos emitidos al crear un nuevo documento.
 */
export interface AddDocumentData {
  name: string;
  hasDocument: boolean;
  file?: File;
}

/**
 * Diálogo modal para agregar un nuevo documento a una convocatoria.
 * Permite ingresar nombre, indicar si tiene archivo y subirlo opcionalmente.
 */
@Component({
  selector: 'app-add-document-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './add-document-dialog.component.html',
  styleUrl: './add-document-dialog.component.css'
})
export class AddDocumentDialogComponent implements OnChanges {
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

  /** Emite los datos al confirmar la creación del documento */
  @Output() addDocument = new EventEmitter<AddDocumentData>();

  // ==================================================================
  // ESTADO DEL FORMULARIO
  // ==================================================================

  /** Nombre del documento */
  documentName = '';

  /** Indica si el documento tendrá un archivo adjunto */
  hasDocument = false;

  /** Archivo seleccionado por el usuario */
  selectedFile: File | null = null;

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
    this.documentName = '';
    this.hasDocument = false;
    this.selectedFile = null;
    this.showErrors = false;

    // Limpiar input de archivo
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // ==================================================================
  // ENVÍO DEL FORMULARIO
  // ==================================================================

  /**
   * Valida y envía los datos del nuevo documento.
   * El nombre es obligatorio. El archivo es opcional si `hasDocument` es true.
   */
  onSubmit(): void {
    const trimmedName = this.documentName?.trim();

    if (!trimmedName) {
      this.showErrors = true;
      return;
    }

    const data: AddDocumentData = {
      name: trimmedName,
      hasDocument: this.hasDocument,
      file: this.hasDocument && this.selectedFile ? this.selectedFile : undefined
    };

    this.addDocument.emit(data);
    this.close();
  }

  // ==================================================================
  // MANEJO DE ARCHIVO
  // ==================================================================

  /**
   * Procesa la selección de un archivo desde el input.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }

  /**
   * Actualiza el estado cuando cambia el checkbox "Tiene documento".
   * Si se desmarca, se limpia el archivo seleccionado.
   */
  onHasDocumentChange(): void {
    if (!this.hasDocument) {
      this.selectedFile = null;
      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';
    }
  }

  // ==================================================================
  // INTERACCIÓN CON UI
  // ==================================================================

  /**
   * Cierra el diálogo al hacer clic en el fondo.
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
    return this.showErrors && !this.documentName?.trim();
  }

  /** Información legible del archivo seleccionado (nombre + tamaño) */
  get fileInfo(): string {
    if (!this.selectedFile) return '';

    const sizeKB = (this.selectedFile.size / 1024).toFixed(2);
    const sizeMB = (this.selectedFile.size / 1024 / 1024).toFixed(2);
    const displaySize = this.selectedFile.size > 1024 * 1024
      ? `${sizeMB} MB`
      : `${sizeKB} KB`;

    return `${this.selectedFile.name} (${displaySize})`;
  }

  /** Habilita el botón de envío solo si hay nombre válido y no está cargando */
  get canSubmit(): boolean {
    return !!this.documentName?.trim() && !this.isLoading;
  }
}