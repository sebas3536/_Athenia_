/* eslint-disable @angular-eslint/prefer-inject */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { PasswordResetService } from 'src/app/services/api/password-reset.service';
import { AlertService } from '@shared/components/alert/alert.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPassword implements OnInit {
  forgotPasswordForm!: FormGroup;
  isLoading = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private passwordResetService: PasswordResetService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email() {
    return this.forgotPasswordForm.get('email');
  }

  onSubmit(): void {
  if (this.forgotPasswordForm.invalid || this.isLoading) {
    this.markFormGroupTouched(this.forgotPasswordForm);
    this.alertService.warning('Por favor ingresa un correo válido.', '');
    return;
  }

  this.isLoading = true;
  const email = this.email?.value;

  this.passwordResetService.checkEmailExists(email).subscribe({
    next: (exists: boolean) => {
      if (!exists) {
        this.isLoading = false;
        this.alertService.error('Correo no encontrado', '');
        return;
      }

      // Si existe, enviamos el correo
      this.passwordResetService.requestPasswordReset(email).subscribe({
        next: () => {
          this.isLoading = false;
          this.alertService.success('Correo de restablecimiento enviado.', '');
          this.router.navigate(['/checkemail'], { queryParams: { email } });
        },
        error: () => {
          this.isLoading = false;
          this.alertService.error('Error al enviar el correo.', '');
        }
      });
    },
    error: () => {
      this.isLoading = false;
      this.alertService.error('Error al verificar el correo.', '');
    }
  });
}


  login(): void {
    this.router.navigate(['/login']);
  }

  register(): void {
    this.router.navigate(['/register']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
