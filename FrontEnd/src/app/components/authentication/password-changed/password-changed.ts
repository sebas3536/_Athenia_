/* eslint-disable @angular-eslint/prefer-inject */

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '@shared/components/alert/alert.service';
import { LucideAngularModule } from "lucide-angular";

@Component({
  selector: 'app-password-changed',
  imports: [LucideAngularModule,
    CommonModule],
  templateUrl: './password-changed.html',
  styleUrl: './password-changed.css'
})
export class PasswordChanged {

  constructor(
    private router: Router,
     private alertService: AlertService
  ) {}

  login(): void {
    this.router.navigate(['/login']);
  }
}