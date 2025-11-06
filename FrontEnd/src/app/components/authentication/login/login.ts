/* eslint-disable @angular-eslint/prefer-inject */

import {
  Component,
  OnDestroy,
  OnInit,
  EventEmitter,
  Output,
} from '@angular/core';
import { Auth as AuthService } from '../auth/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertService } from '@shared/components/alert/alert.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Componente de inicio de sesión.
 * Soporta autenticación básica, 2FA y redirección inteligente.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    LucideAngularModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit, OnDestroy {
  // ==================== OUTPUTS ====================
  @Output() navigate = new EventEmitter<
    'landing' | 'login' | 'register' | 'forgot-password' | 'two_verification'
  >();

  // ==================== ESTADO DEL COMPONENTE ====================
  form!: FormGroup;
  isLoading = false;
  returnUrl = '/app/dashboard';
  showPassword = false;

  private destroy$ = new Subject<void>();

  // ==================== CONSTRUCTOR ====================
  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private alertService: AlertService
  ) {}

  // ==================== CICLO DE VIDA ====================
  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
      return;
    }

    this.initializeForm();
    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'] || '/app/dashboard';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== INICIALIZACIÓN ====================
  private initializeForm(): void {
    this.form = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
          ),
        ],
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false],
    });
  }

  // ==================== ENVÍO DEL FORMULARIO ====================
  onSubmitLogin(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const errors = this.collectFormErrors();
      this.alertService.showErrors(errors);
      return;
    }

    this.performLogin();
  }

  private performLogin(): void {
    this.isLoading = true;
    const { email, password } = this.form.value;

    this.authService
      .login(email, password, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          if (response?.requires_2fa) {
            this.handle2FARequired(email, password);
            return;
          }

          this.handleLoginSuccess();
        },
        error: (error) => {
          this.isLoading = false;

          if (error?.requires2FA) {
            this.handle2FARequired(email, password);
            return;
          }

          this.handleLoginError(error);
        },
      });
  }

  // ==================== MANEJO DE 2FA ====================
  private handle2FARequired(email: string, password: string): void {
    sessionStorage.setItem(
      'temp_2fa_auth',
      JSON.stringify({ email, password })
    );

    this.alertService.info('Verificación de dos factores requerida', '', 3000);

    setTimeout(() => {
      if (this.navigate.observers.length > 0) {
        this.navigate.emit('two_verification');
      } else {
        this.router.navigate(['/twoverification'], {
          queryParams: { returnUrl: this.returnUrl },
        });
      }
    }, 500);
  }

  // ==================== ERRORES DE VALIDACIÓN ====================
  private collectFormErrors(): string[] {
    const errors: string[] = [];

    if (this.email?.errors) {
      if (this.email.errors['required']) {
        errors.push('El correo electrónico es requerido.');
      }
      if (this.email.errors['email'] || this.email.errors['pattern']) {
        errors.push('Ingresa un correo electrónico válido.');
      }
    }

    if (this.password?.errors) {
      if (this.password.errors['required']) {
        errors.push('La contraseña es requerida.');
      }
      if (this.password.errors['minlength']) {
        errors.push('La contraseña debe tener al menos 8 caracteres.');
      }
    }

    return errors;
  }

  // ==================== ÉXITO ====================
  private handleLoginSuccess(): void {
    this.alertService.success('¡Inicio de sesión exitoso!', '', 2000);

    setTimeout(() => {
      this.router.navigateByUrl(this.returnUrl);
    }, 500);
  }

  // ==================== ERRORES DE AUTENTICACIÓN ====================
  private handleLoginError(err: unknown): void {
    this.isLoading = false;
    let errorTitle = 'Error de autenticación';
    let duration = 4000;

    if (err instanceof HttpErrorResponse) {
      const detail = err.error?.detail || '';

      switch (err.status) {
        case 401:
          if (
            detail.includes('Credenciales inválidas') ||
            detail.includes('Credenciales incorrectas')
          ) {
            errorTitle = 'Credenciales inválidas';
            duration = 5000;
          } else if (
            detail.includes('Cuenta desactivada') ||
            detail.includes('Usuario desactivado')
          ) {
            errorTitle = 'Cuenta desactivada';
            duration = 6000;
          } else if (
            detail.includes('Token expirado') ||
            detail.includes('Token inválido')
          ) {
            errorTitle = 'Sesión expirada';
            duration = 4000;
          } else if (detail.includes('Token revocado')) {
            errorTitle = 'Sesión cerrada';
            duration = 4000;
          } else {
            errorTitle = 'Acceso no autorizado';
          }
          break;

        case 403:
          if (
            detail.includes('Cuenta bloqueada') ||
            detail.includes('demasiados intentos')
          ) {
            errorTitle = 'Cuenta bloqueada temporalmente';
            duration = 7000;
          } else if (
            detail.includes('permisos') ||
            detail.includes('administrador')
          ) {
            errorTitle = 'Permisos insuficientes';
            duration = 5000;
          } else {
            errorTitle = 'Acceso prohibido';
          }
          break;

        case 404:
          if (detail.includes('Usuario no encontrado')) {
            errorTitle = 'Usuario no encontrado';
            duration = 5000;
          } else {
            errorTitle = 'Recurso no encontrado';
          }
          break;

        case 409:
          if (detail.includes('Sesión activa')) {
            errorTitle = 'Sesión activa detectada';
            duration = 5000;
          } else {
            errorTitle = 'Conflicto';
          }
          break;

        case 422:
          errorTitle = 'Datos inválidos';
          duration = 5000;
          break;

        case 429:
          errorTitle = 'Has excedido el límite de intentos';
          duration = 6000;
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          errorTitle = 'Error del servidor. Intenta más tarde.';
          duration = 5000;
          break;

        case 0:
          errorTitle = 'Error de conexión';
          duration = 6000;
          break;

        default:
          errorTitle = 'Error inesperado';
          duration = 5000;
      }
    } else if (err instanceof Error) {
      errorTitle = err.message || 'Ocurrió un error inesperado.';
    }

    this.alertService.error(errorTitle, '', duration);
    this.form.patchValue({ password: '' });
  }

  // ==================== UTILIDADES UI ====================
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  register(): void {
    if (this.navigate.observers.length > 0) {
      this.navigate.emit('register');
    } else {
      this.router.navigate(['/register']);
    }
  }

  password_reset(): void {
    if (this.navigate.observers.length > 0) {
      this.navigate.emit('forgot-password');
    } else {
      this.router.navigate(['/passwordreset']);
    }
  }

  // ==================== GETTERS ====================
  get email() {
    return this.form.get('email');
  }

  get password() {
    return this.form.get('password');
  }

  get emailError(): string {
    if (this.email?.hasError('required') && this.email?.touched) {
      return 'El correo electrónico es requerido';
    }
    if (this.email?.hasError('email') || this.email?.hasError('pattern')) {
      return 'Por favor, ingresa un correo electrónico válido';
    }
    return '';
  }

  get passwordError(): string {
    if (this.password?.hasError('required') && this.password?.touched) {
      return 'La contraseña es requerida';
    }
    if (this.password?.hasError('minlength')) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    return '';
  }
}