/* eslint-disable @angular-eslint/prefer-inject */
import { Component, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { PasswordResetService } from 'src/app/services/api/password-reset.service';
import { AlertService } from '@shared/components/alert/alert.service';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [LucideAngularModule, CommonModule, RouterModule],
  templateUrl: './check-email.html',
  styleUrls: ['./check-email.css']
})
export class CheckEmail implements OnDestroy {
  email = '';
  isLoading = false;
  canResend = true;
  resendCountdown = 0;
  private resendInterval?: ReturnType<typeof setInterval>;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private passwordResetService: PasswordResetService,
    private alertService: AlertService
  ) {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });
  }

  resendEmail(): void {
    if (!this.canResend || this.isLoading || !this.email) return;

    this.isLoading = true;

    this.passwordResetService.requestPasswordReset(this.email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.alertService.info(
          'Correo reenviado',
          response.message || 'Se ha enviado nuevamente el correo de restablecimiento.'
        );
        this.startResendCountdown();
      },
      error: (error) => {
        this.isLoading = false;

        if (error.status === 0) {
          this.alertService.error('Sin conexión', 'No se pudo conectar con el servidor. Verifica tu conexión.');
        } else if (error.error?.detail) {
          this.alertService.warning('Atención', error.error.detail);
        } else {
          this.alertService.error('Error', 'Ocurrió un error al reenviar el correo. Intenta nuevamente.');
        }
      }
    });
  }

  private startResendCountdown(): void {
    this.canResend = false;
    this.resendCountdown = 60;

    this.resendInterval = setInterval(() => {
      this.resendCountdown--;

      if (this.resendCountdown <= 0) {
        this.canResend = true;
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
