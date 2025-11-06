/* eslint-disable @angular-eslint/prefer-inject */
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { LucideAngularModule } from "lucide-angular";
import { UserService } from 'src/app/services/api/user-service'
import { CommonModule } from '@angular/common';
import { NgOtpInputComponent } from "ng-otp-input";
import { AlertService } from '@shared/components/alert/alert.service';
import { FormsModule } from '@angular/forms';

type SetupStep = 'qr' | 'verify' | 'backup';

@Component({
  selector: 'app-two-factor-setup-dialog',
  imports: [LucideAngularModule, FormsModule, CommonModule, NgOtpInputComponent],
  templateUrl: './two-factor-setup-dialog.html',
  styleUrl: './two-factor-setup-dialog.css'
})
export class TwoFactorSetupDialog implements OnChanges {
  digit = '';
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();
  @Output() setupComplete = new EventEmitter<void>();

  step: SetupStep = 'qr';
  verificationCode = ['', '', '', '', '', ''];
  copiedSecret = false;
  copiedBackup = false;

  secretKey = '';
  qrCodeUrl = '';
  backupCodes: string[] = [];

  constructor(private userService: UserService, private alertService: AlertService) { }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && changes['open'].currentValue) {
      this.initializeSetup();
    }
  }

  initializeSetup(): void {
    if (this.step === 'backup') return;

    this.step = 'qr';
    this.verificationCode = ['', '', '', '', '', ''];
    this.copiedSecret = false;
    this.copiedBackup = false;

    this.userService.setup2FA().subscribe({
      next: (response) => {
        this.secretKey = response.secret;
        this.qrCodeUrl = response.qr_code;
        this.backupCodes = response.backup_codes || [];
      },
      error: (error) => {
        console.error('Error setting up 2FA:', error);

        if (error.status === 400 && error.error?.detail) {
          
          this.showToast(error.error.detail, 'error');
          
        } else {
          this.showToast('Error al iniciar configuración 2FA', 'error');
          this.closeDialog();
        }
      }
    });
  }


  handleOtpInput(otp: string): void {
    this.verificationCode = otp.split('');
    
  }

  handleOtpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.verificationCode[index] && index > 0) {
      const prevInput = (event.target as HTMLElement).previousElementSibling as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        this.verificationCode[index - 1] = '';
      }
    }
  }

  handleCopySecret(): void {
    navigator.clipboard.writeText(this.secretKey);
    this.copiedSecret = true;
    this.showToast('Código secreto copiado', 'success');
    setTimeout(() => this.copiedSecret = false, 2000);
  }

  handleCopyBackupCodes(): void {
    const codesText = this.backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    this.copiedBackup = true;
    this.showToast('Códigos de respaldo copiados', 'success');
    setTimeout(() => this.copiedBackup = false, 2000);
  }

  handleDownloadBackupCodes(): void {
    const content = `CÓDIGOS DE RESPALDO - ASISTENTE VIRTUAL IA\n\nGuarda estos códigos en un lugar seguro.\nCada código solo puede usarse una vez.\n\n${this.backupCodes.join('\n')}\n\nFecha de generación: ${new Date().toLocaleString()}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codigos-respaldo-2fa.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Códigos descargados', 'success');
  }

  continueToVerify(): void {
    this.step = 'verify';
    this.verificationCode = ['', '', '', '', '', ''];
  }

  goBack(): void {
    if (this.step === 'verify') {
      this.step = 'qr';
      this.verificationCode = ['', '', '', '', '', ''];
    }
  }

  handleVerify(): void {
    const code = this.verificationCode.join('');

    if (code.length !== 6) {
      this.showToast('Por favor ingresa el código de 6 dígitos', 'error');
      return;
    }

    this.userService.confirm2FA({ code }).subscribe({
      next: () => {
        this.showToast('¡Código verificado!', 'success');
        this.step = 'backup';
      },
      error: (error) => {
        console.error('Error verifying 2FA:', error);
        this.showToast('Código incorrecto. Inténtalo de nuevo', 'error');
        this.verificationCode = ['', '', '', '', '', ''];
        setTimeout(() => {
          const firstInput = document.querySelector('.otp-input') as HTMLInputElement;
          if (firstInput) firstInput.focus();
        }, 100);
      }
    });
  }

  handleComplete(): void {
    this.showToast('Autenticación de dos factores activada correctamente', 'success');
    this.setupComplete.emit();
    this.closeDialog();
  }

  handleCancel(): void {
    if (confirm('¿Estás seguro de que deseas cancelar la configuración de 2FA?')) {
      this.closeDialog();
    }
  }

  closeDialog(): void {
    this.openChange.emit(false);
    setTimeout(() => {
      this.step = 'qr';
      this.verificationCode = ['', '', '', '', '', ''];
      this.copiedSecret = false;
      this.copiedBackup = false;
    }, 300);
  }

  get isCodeComplete(): boolean {
    return this.verificationCode.every(digit => digit !== '');
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
  switch(type) {
    case 'success':
      this.alertService.success('Éxito', message);
      break;
    case 'error':
      this.alertService.error('Error', message);
      break;
    case 'info':
    default:
      this.alertService.info('Información', message);
      break;
  }
}

}
