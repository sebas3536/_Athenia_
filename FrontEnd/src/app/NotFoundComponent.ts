/* eslint-disable @angular-eslint/prefer-inject */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container mx-auto p-6 text-center">
      <h2 class="text-2xl font-bold mb-4">Página no encontrada</h2>
      <p class="mb-4">Lo sentimos, la página que buscas no existe.</p>
      <a routerLink="/login" class="text-blue-600 hover:underline">Ir al inicio de sesión</a>
    </div>
  `,
})
export class NotFoundComponent {

  constructor(private router: Router) {

    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 3000);
  }
}