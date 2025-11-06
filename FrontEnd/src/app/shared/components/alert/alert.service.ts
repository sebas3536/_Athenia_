/* eslint-disable @typescript-eslint/no-empty-function */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AlertConfig {
    id: string;
    title: string;
    description: string;
    type: 'default' | 'info' | 'success' | 'warning' | 'error' | 'confirm';
    appearance?: 'outline' | 'soft' | 'fill';
    icon?: string;
    duration?: number; 
    showClose?: boolean; 
    confirmCallback?: (confirmed: boolean) => void; 
}

@Injectable({
    providedIn: 'root'
})
export class AlertService {
    private readonly MAX_ALERTS = 3;
    private alertsSubject = new BehaviorSubject<AlertConfig[]>([]);
    public alerts$: Observable<AlertConfig[]> = this.alertsSubject.asObservable();

    constructor() { }

    /**
     * Muestra una alerta de éxito
     */
    success(title: string, description: string, duration = 3000): void {
        this.show({
            id: this.generateId(),
            title,
            description,
            type: 'success',
            appearance: 'fill',
            duration,
            showClose: false
        });
    }

    /**
     * Muestra una alerta de error
     */
    error(title: string, description: string, duration = 4000): void {
        this.show({
            id: this.generateId(),
            title,
            description,
            type: 'error',
            appearance: 'fill',
            duration,
            showClose: false
        });
    }

    /**
     * Muestra una alerta de advertencia
     */
    warning(title: string, description: string, duration = 3500): void {
        this.show({
            id: this.generateId(),
            title,
            description,
            type: 'warning',
            appearance: 'fill',
            duration,
            showClose: false
        });
    }

    /**
     * Muestra una alerta informativa
     */
    info(title: string, description: string, duration = 3000): void {
        this.show({
            id: this.generateId(),
            title,
            description,
            type: 'info',
            appearance: 'fill',
            duration,
            showClose: false
        });
    }

    /**
     * Muestra múltiples alertas de error (útil para validaciones)
     */
    showErrors(errors: string[], duration = 4000): void {
        const limitedErrors = errors.slice(0, this.MAX_ALERTS);
        limitedErrors.forEach((error, index) => {
            setTimeout(() => {
                this.error(error, '', duration);
            }, index * 100);
        });
    }

    /**
     * Muestra una alerta personalizada
     */
    show(config: Omit<AlertConfig, 'id'> & { id?: string }): void {
        const alert: AlertConfig = {
            ...config,
            id: config.id || this.generateId(),
            appearance: config.appearance || 'fill',
            duration: config.duration ?? 3000,
            showClose: config.showClose ?? false 
        };

        const currentAlerts = this.alertsSubject.value;

        
        if (currentAlerts.length >= this.MAX_ALERTS) {
            currentAlerts.shift();
        }

        this.alertsSubject.next([...currentAlerts, alert]);

        
        if (alert.duration && alert.duration > 0) {
            setTimeout(() => {
                this.dismiss(alert.id);
            }, alert.duration);
        }
    }

    /**
     * Cierra una alerta específica
     */
    dismiss(id: string): void {
        const currentAlerts = this.alertsSubject.value;
        this.alertsSubject.next(currentAlerts.filter(alert => alert.id !== id));
    }

    /**
     * Cierra todas las alertas
     */
    dismissAll(): void {
        this.alertsSubject.next([]);
    }

    /**
     * CONFIRM: Muestra una alerta tipo confirmación (Aceptar / Cancelar)
     * Retorna una Promise<boolean> que se resuelve cuando el usuario responde.
     */
    confirm(title: string, description: string): Promise<boolean> {
        return new Promise((resolve) => {
            const id = this.generateId();

            const confirmAlert: AlertConfig = {
                id,
                title,
                description,
                type: 'confirm',
                appearance: 'fill',
                duration: 0, 
                showClose: false,
                confirmCallback: (confirmed: boolean) => {
                    this.dismiss(id);
                    resolve(confirmed);
                }
            };

            const currentAlerts = this.alertsSubject.value;
            if (currentAlerts.length >= this.MAX_ALERTS) {
                currentAlerts.shift();
            }

            this.alertsSubject.next([...currentAlerts, confirmAlert]);
        });
    }

    /**
     * Genera un ID único para cada alerta
     */
    private generateId(): string {
        return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}