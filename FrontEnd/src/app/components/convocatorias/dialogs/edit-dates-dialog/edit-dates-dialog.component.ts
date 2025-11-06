/* eslint-disable @angular-eslint/prefer-inject */
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Convocatoria } from 'src/app/domain/models/convocatorias.model';
import { DeadlineService } from '../../services/deadline.service';

/**
 * Datos emitidos al actualizar las fechas de una convocatoria.
 */
export interface UpdateDatesData {
    startDate?: Date;
    endDate?: Date;
}

/**
 * Diálogo modal para editar las fechas de inicio y fin de una convocatoria.
 * Valida que las fechas sean futuras y que la fecha de fin sea posterior a la de inicio.
 */
@Component({
    selector: 'app-edit-dates-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './edit-dates-dialog.component.html',
    styleUrl: './edit-dates-dialog.component.css'
})
export class EditDatesDialogComponent implements OnChanges {
    // ==================================================================
    // INPUTS
    // ==================================================================

    /** Controla la visibilidad del diálogo */
    @Input() open = false;

    /** Indica si está en proceso de carga (deshabilita interacciones) */
    @Input() isLoading = false;

    /** Convocatoria actual (necesaria para inicializar fechas) */
    @Input() convocatoria?: Convocatoria;

    // ==================================================================
    // OUTPUTS
    // ==================================================================

    /** Emite cuando cambia el estado de apertura */
    @Output() openChange = new EventEmitter<boolean>();

    /** Emite los datos actualizados de fechas */
    @Output() updateDates = new EventEmitter<UpdateDatesData>();

    // ==================================================================
    // ESTADO DEL FORMULARIO
    // ==================================================================

    /** Fecha de inicio en formato string (YYYY-MM-DD) */
    startDateInput = '';

    /** Fecha de fin en formato string (YYYY-MM-DD) */
    endDateInput = '';

    /** Muestra errores de validación */
    showErrors = false;

    /** Mensaje de error específico */
    errorMessage = '';

    // ==================================================================
    // CONSTRUCTOR
    // ==================================================================

    constructor(private deadlineService: DeadlineService) { }

    // ==================================================================
    // LIFECYCLE HOOKS
    // ==================================================================

    /**
     * Detecta cambios en `@Input open` y en `convocatoria` para inicializar el formulario.
     */
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['open'] && this.open && this.convocatoria) {
            this.initializeForm();
        }
    }

    // ==================================================================
    // INICIALIZACIÓN DEL FORMULARIO
    // ==================================================================

    /**
     * Inicializa los campos del formulario con las fechas actuales de la convocatoria.
     */
    private initializeForm(): void {
        this.startDateInput = this.convocatoria?.startDate
            ? this.deadlineService.toInputDateFormat(this.convocatoria.startDate)
            : '';

        this.endDateInput = this.convocatoria?.endDate
            ? this.deadlineService.toInputDateFormat(this.convocatoria.endDate)
            : '';

        this.showErrors = false;
        this.errorMessage = '';
    }

    /**
     * Resetea todos los campos del formulario.
     */
    private resetForm(): void {
        this.startDateInput = '';
        this.endDateInput = '';
        this.showErrors = false;
        this.errorMessage = '';
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

    // ==================================================================
    // ENVÍO DEL FORMULARIO
    // ==================================================================

    /**
     * Valida las fechas y emite los datos si son válidos.
     */
    onSubmit(): void {
        if (!this.validateDates()) {
            this.showErrors = true;
            return;
        }

        this.updateDates.emit({
            startDate: this.startDateInput ? new Date(this.startDateInput) : undefined,
            endDate: this.endDateInput ? new Date(this.endDateInput) : undefined
        });

        this.close();
    }

    // ==================================================================
    // VALIDACIÓN DE FECHAS
    // ==================================================================

    /**
     * Elimina la parte de hora de una fecha (útil para comparación de días).
     */
    private stripTime(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    /**
     * Valida que:
     * - Las fechas sean futuras
     * - La fecha de fin sea posterior a la de inicio
     * @returns `true` si las fechas son válidas
     */
    private validateDates(): boolean {
        const startDate = this.startDateInput ? this.stripTime(new Date(this.startDateInput)) : null;
        const endDate = this.endDateInput ? this.stripTime(new Date(this.endDateInput)) : null;
        const today = this.stripTime(new Date());

        // Validar rango de fechas
        if (startDate && endDate && endDate <= startDate) {
            this.errorMessage = 'La fecha límite debe ser posterior a la fecha de inicio';
            return false;
        }

        // Validar que no sean en el pasado
        if (startDate && startDate < today) {
            this.errorMessage = 'La fecha de inicio no puede ser en el pasado';
            return false;
        }

        if (endDate && endDate < today) {
            this.errorMessage = 'La fecha límite no puede ser en el pasado';
            return false;
        }

        this.errorMessage = '';
        return true;
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

    /** Indica si la fecha de inicio es válida (no en el pasado) */
    get isStartDateValid(): boolean {
        if (!this.startDateInput) return true;
        const date = this.stripTime(new Date(this.startDateInput));
        const today = this.stripTime(new Date());
        return date >= today;
    }

    /** Indica si la fecha de fin es válida (no en el pasado) */
    get isEndDateValid(): boolean {
        if (!this.endDateInput) return true;
        const date = this.stripTime(new Date(this.endDateInput));
        const today = this.stripTime(new Date());
        return date >= today;
    }

    /** Indica si el rango de fechas es válido (fin > inicio) */
    get isDateRangeValid(): boolean {
        if (!this.startDateInput || !this.endDateInput) return true;
        const start = this.stripTime(new Date(this.startDateInput));
        const end = this.stripTime(new Date(this.endDateInput));
        return end > start;
    }

    // ==================================================================
    // ESTADO DEL DEADLINE (texto amigable)
    // ==================================================================

    /**
     * Devuelve el texto descriptivo del estado actual del deadline.
     */
    getCurrentDeadlineStatus(endDate?: Date): string {
        return endDate
            ? this.deadlineService.getDeadlineText(endDate)
            : 'Sin fecha límite';
    }

    /**
     * Devuelve el texto descriptivo del nuevo deadline propuesto.
     */
    getNewDeadlineStatus(): string {
        if (!this.endDateInput) return 'Sin fecha límite';
        return this.deadlineService.getDeadlineText(new Date(this.endDateInput));
    }

    // ==================================================================
    // VALIDACIÓN DE ENVÍO
    // ==================================================================

    /** Habilita el botón de envío solo si no hay errores y no está cargando */
    get canSubmit(): boolean {
        return this.validateDates() && !this.isLoading;
    }
}