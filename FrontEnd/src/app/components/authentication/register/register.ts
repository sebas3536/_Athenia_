/* eslint-disable @angular-eslint/prefer-inject */

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Auth as AuthService } from '../auth/auth';
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  FormGroup,
  Validators,
  FormControl,
  ReactiveFormsModule,
  FormBuilder
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { AlertService } from '@shared/components/alert/alert.service';

/**
 * Validador personalizado: fuerza una contraseña fuerte.
 * Requiere: mayúscula, minúscula, número, carácter especial y mínimo 8 caracteres.
 */
export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const isLongEnough = value.length >= 8;

    return hasUpperCase && hasLowerCase && hasNumeric && hasSpecial && isLongEnough
      ? null
      : { weakPassword: true };
  };
}

/**
 * Validador de grupo: verifica que las contraseñas coincidan.
 */
export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword
      ? { passwordMismatch: true }
      : null;
  };
}

/**
 * Componente de registro de usuarios.
 * Incluye validaciones avanzadas de formulario y manejo completo de errores.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    LucideAngularModule
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private alertService: AlertService
  ) {}

  // ==================== CICLO DE VIDA ====================

  ngOnInit(): void {
    this.initializeForm();
  }

  // ==================== INICIALIZACIÓN DEL FORMULARIO ====================

  /**
   * Configura el formulario con validaciones robustas:
   * - Nombre: sin números, 2-50 caracteres
   * - Email: formato válido, máx. 100
   * - Contraseña: 8+ caracteres, mayúscula, minúscula, número, especial
   * - Confirmación: debe coincidir
   * - Términos: aceptación obligatoria
   */
  private initializeForm(): void {
    this.registerForm = new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[^0-9]*$/)
      ]),
      email: new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100)
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        passwordStrengthValidator()
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
      terms: new FormControl(false, Validators.requiredTrue)
    }, { validators: passwordMatchValidator() });

    // Actualiza confirmación cuando cambia la contraseña
    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.registerForm.get('confirmPassword')?.updateValueAndValidity();
    });
  }

  // ==================== ENVÍO DEL FORMULARIO ====================

  /**
   * Procesa el envío del formulario.
   * Valida localmente antes de enviar al backend.
   */
  onSubmitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      const errors = this.collectFormErrors();
      this.alertService.showErrors(errors);
      return;
    }

    this.performRegistration();
  }

  /**
   * Envía los datos al servicio de autenticación.
   */
  private performRegistration(): void {
    this.isLoading = true;
    const { name, email, password, confirmPassword } = this.registerForm.value;
    const userData = { name, email, password, password_confirm: confirmPassword };

    this.authService.signup(userData).subscribe({
      next: () => {
        this.isLoading = false;
        this.handleSuccessfulRegistration();
      },
      error: (err) => {
        this.isLoading = false;
        this.handleRegistrationError(err);
      }
    });
  }

  // ==================== MANEJO DE ERRORES LOCALES ====================

  /**
   * Recopila todos los errores de validación del formulario para mostrarlos.
   */
  private collectFormErrors(): string[] {
    const errors: string[] = [];

    if (this.name?.errors) {
      if (this.name.errors['required']) {
        errors.push('El nombre es requerido.');
      }
      if (this.name.errors['minlength']) {
        errors.push('El nombre debe tener al menos 2 caracteres.');
      }
      if (this.name.errors['maxlength']) {
        errors.push('El nombre no debe exceder 50 caracteres.');
      }
      if (this.name.errors['pattern']) {
        errors.push('El nombre no debe contener números.');
      }
    }

    if (this.email?.errors) {
      if (this.email.errors['required']) {
        errors.push('El correo es requerido.');
      }
      if (this.email.errors['email']) {
        errors.push('El correo debe ser válido.');
      }
      if (this.email.errors['maxlength']) {
        errors.push('El correo no debe exceder 100 caracteres.');
      }
    }

    if (this.password?.errors) {
      if (this.password.errors['required']) {
        errors.push('La contraseña es requerida.');
      }
      if (this.password.errors['minlength']) {
        errors.push('La contraseña debe tener al menos 8 caracteres.');
      }
      if (this.password.errors['weakPassword']) {
        errors.push('La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales.');
      }
    }

    if (this.registerForm.errors?.['passwordMismatch']) {
      errors.push('Las contraseñas no coinciden.');
    }

    if (!this.termsAccepted) {
      errors.push('Debes aceptar los términos y condiciones.');
    }

    return errors;
  }

  // ==================== RESPUESTAS DEL SERVIDOR ====================

  /**
   * Muestra éxito y redirige al dashboard tras registro.
   */
  private handleSuccessfulRegistration(): void {
    this.alertService.success('¡Registro exitoso!', '');

    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 2000);
  }

  /**
   * Procesa errores del backend y muestra mensaje amigable.
   */
  private handleRegistrationError(err: unknown): void {
    let errorMessage = 'Error en el registro.';

    if (err instanceof HttpErrorResponse) {
      errorMessage = this.getHttpErrorMessage(err);
    }

    this.alertService.error(errorMessage, '', 4000);
  }

  /**
   * Interpreta códigos HTTP del backend y devuelve mensaje claro.
   */
  private getHttpErrorMessage(err: HttpErrorResponse): string {
    switch (err.status) {
      case 400:
        return err.error?.detail || 'Datos inválidos. Por favor, revisa el formulario.';
      case 409:
        return 'Este correo electrónico ya está registrado.';
      case 422:
        return 'Formato de datos inválido. Revisa los campos.';
      case 500:
        return 'Error del servidor. Intenta de nuevo más tarde.';
      default:
        return err.error?.detail || `Error inesperado: ${err.status}`;
    }
  }

  // ==================== NAVEGACIÓN ====================

  /**
   * Redirige al formulario de inicio de sesión.
   */
  login(): void {
    this.router.navigate(['/login']);
  }

  // ==================== GETTERS PARA TEMPLATE ====================

  get termsAccepted(): boolean {
    return this.registerForm.get('terms')?.value;
  }

  get name() {
    return this.registerForm.get('name');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }
}