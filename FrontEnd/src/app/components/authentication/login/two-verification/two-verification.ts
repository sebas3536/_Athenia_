/* eslint-disable @angular-eslint/prefer-inject */
import { LucideAngularModule } from "lucide-angular";
import { NgOtpInputComponent } from 'ng-otp-input';
import { Component, EventEmitter, Output, OnDestroy, OnInit, NgZone } from '@angular/core';
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/api/user-service';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertService } from '@shared/components/alert/alert.service';
import { Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Auth as AuthService } from '../../auth/auth';
import { Temp2FAAuth } from 'src/app/domain/models/user.model';

@Component({
  selector: 'app-two-verification',
  imports: [LucideAngularModule, NgOtpInputComponent, CommonModule, FormsModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './two-verification.html',
  styleUrls: ['./two-verification.css']
})
export class TwoVerification implements OnInit, OnDestroy {
  @Output() navigate = new EventEmitter<
    'landing' | 'login' | 'register' | 'forgot-password' | 'check-email' | 'reset-password' | 'password-changed' | 'two-factor'
  >();
  @Output() verifySuccess = new EventEmitter<void>();

  twoFaForm: FormGroup;
  useBackupCode = false;
  isLoading = false;

  private returnUrl: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private fb: FormBuilder,
    private ngZone: NgZone
  ) {
    // ✅ CORREGIDO: Validaciones mejoradas para ambos tipos de código
    this.twoFaForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      backupCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{8}$/)]] // 8 caracteres alfanuméricos
    });
  }

  private get tempAuth(): Temp2FAAuth | null {
    const tempAuthString = sessionStorage.getItem('temp_2fa_auth');
    if (!tempAuthString) return null;
    try {
      return JSON.parse(tempAuthString) as Temp2FAAuth;
    } catch {
      return null;
    }
  }

  handleOtpInput(value: string): void {
    this.twoFaForm.get('code')?.setValue(value);
  }

  ngOnInit(): void {
    const tempAuth = this.tempAuth;
    if (!tempAuth?.email || !tempAuth?.password) {
      this.router.navigate(['/login']);
      return;
    }

    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    sessionStorage.removeItem('temp_2fa_auth');
  }

  toggleBackup(): void {
    this.useBackupCode = !this.useBackupCode;
    this.twoFaForm.reset();
  }

  /**
   * ✅ CORREGIDO: Validación mejorada para códigos de respaldo
   */
  handleVerify(): void {
    if (!this.tempAuth) {
      this.alertService.error('Sesión expirada. Por favor, inicia sesión nuevamente', '', 4000);
      this.navigate.emit('login');
      return;
    }

    // Validación según el tipo de código
    if (!this.useBackupCode) {
      const codeControl = this.twoFaForm.get('code');
      if (codeControl?.invalid) {
        this.alertService.error('Por favor ingresa el código de 6 dígitos', '', 3000);
        return;
      }
    } else {
      const backupControl = this.twoFaForm.get('backupCode');
      if (backupControl?.invalid) {
        this.alertService.error('Por favor ingresa un código de respaldo válido (8 caracteres)', '', 3000);
        return;
      }
    }

    const code = this.useBackupCode
      ? this.twoFaForm.get('backupCode')?.value.trim().toUpperCase()
      : this.twoFaForm.get('code')?.value.trim();

    this.verify2FACode(code);
  }

  private verify2FACode(code: string): void {
    const tempAuth = this.tempAuth;
    if (!tempAuth) {
      this.alertService.error('Sesión expirada. Por favor, inicia sesión nuevamente', '', 4000);
      this.navigate.emit('login');
      return;
    }

    this.isLoading = true;

    this.authService.loginWith2FA({
      username: tempAuth.email,
      password: tempAuth.password,
      code: code,
      single_session: true
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.handleVerifySuccess(),
        error: (error) => this.handleVerifyError(error)
      });
  }

  private handleVerifySuccess(): void {
    this.isLoading = false;
    sessionStorage.removeItem('temp_2fa_auth');

    this.alertService.success('¡Código verificado correctamente!', '', 2000);

    if (this.useBackupCode) {
      setTimeout(() => {
        this.alertService.info('Este código de respaldo ya no se puede usar', '', 4000);
      }, 2500);
    }

    setTimeout(() => {
      this.verifySuccess.emit();
      if (this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl);
      } else {
        this.router.navigate(['/app/dashboard']);
      }
    }, 500);
  }

  /**
   * ✅ MEJORADO: Manejo de errores más específico
   */
  private handleVerifyError(err: unknown): void {
    this.isLoading = false;

    const { message, duration } = this.getErrorMessage(err);

    this.alertService.error(message, '', duration);

    // Limpiar el campo correspondiente
    if (this.useBackupCode) {
      this.twoFaForm.get('backupCode')?.reset();
    } else {
      this.twoFaForm.get('code')?.reset();
    }

    // Enfocar el input después de limpiar
    setTimeout(() => {
      this.ngZone.run(() => {
        if (this.useBackupCode) {
          const backupInput = document.querySelector('input[formControlName="backupCode"]') as HTMLInputElement;
          if (backupInput) backupInput.focus();
        } else {
          const firstInput = document.querySelector('.otp-input') as HTMLInputElement;
          if (firstInput) firstInput.focus();
        }
      });
    }, 100);
  }

  /**
   * ✅ MEJORADO: Mensajes de error más específicos para códigos de respaldo
   */
  private getErrorMessage(err: unknown): { message: string; duration: number } {
    let errorMessage = 'Error al verificar el código';
    let duration = 4000;

    if (err instanceof HttpErrorResponse) {
      const detail = err.error?.detail || '';

      switch (err.status) {
        case 401:
          if (this.useBackupCode) {
            if (detail.includes('inválido') || detail.includes('usado')) {
              errorMessage = 'Código de respaldo inválido o ya usado';
              duration = 4000;
            } else {
              errorMessage = 'Código de respaldo incorrecto';
              duration = 3000;
            }
          } else {
            if (detail.includes('Código inválido') || detail.includes('incorrecto')) {
              errorMessage = 'Código TOTP incorrecto. Verifica tu autenticador';
              duration = 3000;
            } else if (detail.includes('expirado')) {
              errorMessage = 'El código ha expirado. Usa el código actual';
              duration = 4000;
            } else {
              errorMessage = 'Autenticación fallida';
            }
          }
          break;

        case 403:
          errorMessage = 'Cuenta bloqueada. Contacta soporte';
          duration = 5000;
          break;

        case 429:
          errorMessage = 'Demasiados intentos. Espera unos minutos';
          duration = 6000;
          break;

        case 500:
        case 502:
        case 503:
          errorMessage = 'Error del servidor. Intenta de nuevo más tarde';
          duration = 5000;
          break;

        default:
          errorMessage = detail || 'Error desconocido. Inténtalo de nuevo';
      }
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }

    return { message: errorMessage, duration };
  }

  handleResendCode(): void {
    this.alertService.info(
      'Asegúrate de que la hora de tu dispositivo esté sincronizada correctamente. Los códigos TOTP dependen de la hora exacta.',
      'Sincronización de hora',
      6000
    );
  }

  goBackToLogin(): void {
    sessionStorage.removeItem('temp_2fa_auth');
    this.navigate.emit('login');
  }
}