/* eslint-disable @angular-eslint/prefer-inject */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PasswordResetService } from 'src/app/services/api/password-reset.service';
import { AlertService } from '@shared/components/alert/alert.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPassword implements OnInit {
  resetForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  token = '';

  strength = 0;
  strengthLabel = '';
  strengthColor = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private passwordResetService: PasswordResetService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    // Formulario de restablecimiento
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    // Capturar token desde la URL
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.alertService.warning('Token inválido o expirado', '');
      this.router.navigate(['/forgotpassword']);
      return;
    }

    // Evaluar fortaleza de contraseña mientras se escribe
    this.resetForm.get('password')?.valueChanges.subscribe(value => {
      this.evaluatePasswordStrength(value);
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  passwordMatchValidator(form: FormGroup) {
    const pass = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  // Evalúa fortaleza de la contraseña
  evaluatePasswordStrength(password: string): void {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    this.strength = strength;
    this.strengthLabel = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'][strength - 1] || '';
    this.strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-[#02ab74]', 'bg-green-600'][strength - 1] || 'bg-gray-300';
  }

  // Reglas de validación
  hasMinLength(): boolean { return this.resetForm.get('password')?.value.length >= 8; }
  hasUppercase(): boolean { return /[A-Z]/.test(this.resetForm.get('password')?.value); }
  hasLowercase(): boolean { return /[a-z]/.test(this.resetForm.get('password')?.value); }
  hasNumber(): boolean { return /[0-9]/.test(this.resetForm.get('password')?.value); }

  onSubmit(): void {
    if (this.resetForm.invalid || this.isLoading) {
      this.resetForm.markAllAsTouched();
      this.alertService.warning('Por favor completa correctamente los campos.', '');
      return;
    }

    const newPassword = this.resetForm.get('password')?.value;
    const confirmPassword = this.resetForm.get('confirmPassword')?.value;

    if (newPassword !== confirmPassword) {
      this.alertService.warning('Las contraseñas no coinciden.', '');
      return;
    }

    this.isLoading = true;

    // Solo enviamos token y new_password al backend
    this.passwordResetService.resetPassword(this.token, newPassword).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.alertService.success(response.message || 'Contraseña actualizada correctamente', '');

        // Transición suave
        setTimeout(() => {
          const container = document.querySelector('.reset-password-container');
          if (container) {
            container.classList.add('fade-out');
            setTimeout(() => this.router.navigate(['/passwordchanged']), 400);
          } else {
            this.router.navigate(['/passwordchanged']);
          }
        }, 1200);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 422) {
          this.alertService.warning('Formato de datos inválido.', '');
        } else if (error.status === 401) {
          this.alertService.warning('Token inválido o expirado.', '');
          this.router.navigate(['/forgotpassword']);
        } else {
          this.alertService.error('Error al actualizar la contraseña.', 'Intenta nuevamente.');
        }
      }
    });
  }
}
