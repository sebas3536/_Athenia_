// src/app/features/convocatorias/utils/progress.utils.ts

import { Injectable } from '@angular/core';
import { Convocatoria, ConvocatoriaProgress, ConvocatoriaDocument } from 'src/app/domain/models/convocatorias.model';

@Injectable({
    providedIn: 'root'
})
export class ProgressUtilsService {

    /**
     * Calcula el progreso de documentos completados
     * @param convocatoria - La convocatoria a evaluar
     * @returns Objeto con completed, total y percentage
     */
    calculateProgress(convocatoria: Convocatoria): ConvocatoriaProgress {
        if (!convocatoria.documents || convocatoria.documents.length === 0) {
            return { completed: 0, total: 0, percentage: 0 };
        }

        const total = convocatoria.documents.length;
        const completed = convocatoria.documents.filter(
            doc => doc.status === 'completed'
        ).length;

        return {
            completed,
            total,
            percentage: (completed / total) * 100
        };
    }

    /**
     * Determina si la convocatoria está completada
     * @param convocatoria - La convocatoria a evaluar
     * @returns boolean
     */
    isConvocatoriaComplete(convocatoria: Convocatoria): boolean {
        if (!convocatoria.documents || convocatoria.documents.length === 0) {
            return false;
        }
        const progress = this.calculateProgress(convocatoria);
        return progress.completed === progress.total;
    }

    /**
     * Cuenta documentos pendientes
     * @param documents - Array de documentos
     * @returns Número de documentos pendientes
     */
    countPendingDocuments(documents: ConvocatoriaDocument[]): number {
        return documents.filter(doc => doc.status === 'pending').length;
    }

    /**
     * Cuenta documentos completados
     * @param documents - Array de documentos
     * @returns Número de documentos completados
     */
    countCompletedDocuments(documents: ConvocatoriaDocument[]): number {
        return documents.filter(doc => doc.status === 'completed').length;
    }

    /**
     * Obtiene el porcentaje de progreso como número entero
     * @param convocatoria - La convocatoria a evaluar
     * @returns Número entre 0-100
     */
    getProgressPercentage(convocatoria: Convocatoria): number {
        return Math.round(this.calculateProgress(convocatoria).percentage);
    }

    /**
     * Obtiene un texto descriptivo del progreso
     * @param convocatoria - La convocatoria a evaluar
     * @returns String descriptivo
     */
    getProgressDescription(convocatoria: Convocatoria): string {
        const progress = this.calculateProgress(convocatoria);

        if (progress.total === 0) {
            return 'Sin documentos';
        }

        if (progress.completed === 0) {
            return `${progress.total} documentos pendientes`;
        }

        if (progress.completed === progress.total) {
            return 'Completado 100%';
        }

        return `${progress.completed} de ${progress.total} completados`;
    }

    /**
     * Calcula el ancho del progress bar como porcentaje
     * @param convocatoria - La convocatoria a evaluar
     * @returns String con el porcentaje para CSS
     */
    getProgressBarWidth(convocatoria: Convocatoria): string {
        return `${this.calculateProgress(convocatoria).percentage}%`;
    }

    /**
     * Obtiene la clase CSS según el nivel de progreso
     * @param convocatoria - La convocatoria a evaluar
     * @returns String con clase CSS
     */
    getProgressClassByLevel(convocatoria: Convocatoria): string {
        const percentage = this.calculateProgress(convocatoria).percentage;

        if (percentage === 0) return 'bg-gray-200';
        if (percentage < 25) return 'bg-red-400';
        if (percentage < 50) return 'bg-orange-400';
        if (percentage < 75) return 'bg-yellow-400';
        if (percentage < 100) return 'bg-blue-400';
        return 'bg-green-500';
    }

    /**
     * Valida si el progreso es suficiente
     * @param convocatoria - La convocatoria a evaluar
     * @param minimumPercentage - Porcentaje mínimo requerido
     * @returns boolean
     */
    isProgressSufficient(convocatoria: Convocatoria, minimumPercentage = 100): boolean {
        const progress = this.calculateProgress(convocatoria);
        return progress.percentage >= minimumPercentage;
    }

    /**
     * Calcula el tiempo estimado restante basado en velocidad de completado
     * @param convocatoria - La convocatoria a evaluar
     * @param createdDate - Fecha de creación
     * @returns Estimación en días
     */
    estimateRemainingTime(convocatoria: Convocatoria, createdDate: Date): number | null {
        const progress = this.calculateProgress(convocatoria);

        if (progress.completed === progress.total) return 0;
        if (progress.completed === 0) return null;

        const now = new Date();
        const elapsedTime = now.getTime() - createdDate.getTime();
        const elapsedDays = elapsedTime / (1000 * 60 * 60 * 24);

        const completionRate = progress.completed / elapsedDays;
        const remainingDocuments = progress.total - progress.completed;
        const estimatedDays = Math.round(remainingDocuments / completionRate);

        return estimatedDays > 0 ? estimatedDays : null;
    }

    /**
     * Obtiene estadísticas detalladas del progreso
     * @param convocatoria - La convocatoria a evaluar
     * @returns Objeto con estadísticas
     */
    getProgressStats(convocatoria: Convocatoria): {
        completed: number;
        pending: number;
        total: number;
        percentage: number;
        isComplete: boolean;
    } {
        const progress = this.calculateProgress(convocatoria);
        return {
            completed: progress.completed,
            pending: progress.total - progress.completed,
            total: progress.total,
            percentage: progress.percentage,
            isComplete: this.isConvocatoriaComplete(convocatoria)
        };
    }
}