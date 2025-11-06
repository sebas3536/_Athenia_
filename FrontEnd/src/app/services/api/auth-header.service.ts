
import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthHeaderService {
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}