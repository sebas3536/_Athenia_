// twoFactorGuard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

/**
 * Guard funcional para proteger la ruta de verificación 2FA
 */
export const twoFactorGuard: CanActivateFn = () => {
    const router = inject(Router);
    const tempAuth = sessionStorage.getItem('temp_2fa_auth');

    if (!tempAuth) {
        console.warn('Intento de acceso a 2FA sin credenciales temporales');
        router.navigate(['/login']);
        return false;
    }

    try {
        const { email, password } = JSON.parse(tempAuth);

        if (!email || !password) {
            console.warn('Datos de 2FA inválidos');
            sessionStorage.removeItem('temp_2fa_auth');
            router.navigate(['/login']);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error al validar datos de 2FA:', error);
        sessionStorage.removeItem('temp_2fa_auth');
        router.navigate(['/login']);
        return false;
    }
};