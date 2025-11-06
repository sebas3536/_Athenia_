/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @angular-eslint/prefer-inject */

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertConfig, AlertService } from '@shared/components/alert/alert.service';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, Subject, takeUntil } from 'rxjs';
import { UserService } from 'src/app/services/api/user-service';
import { Api } from 'src/app/services/api/api';
import { Api as DocumentService } from '../../services/api/api';
import { DocumentWithMetadata, UserExtended } from 'src/app/domain/models/document.model';
import { UserRole, User } from 'src/app/domain/models/user.model';
import { ProfileAvatar } from '@shared/components/profile-avatar/profile-avatar';

/**
 * Componente de administración de usuarios.
 * Soporta: listado, filtrado, cambio de rol, activación/desactivación,
 * eliminación, visualización de documentos por usuario y estadísticas.
 */
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ProfileAvatar],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ==================== FILTROS DE BÚSQUEDA ====================
  searchQuery = '';
  roleFilter: 'all' | UserRole = 'all';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  UserRole = UserRole;

  // ==================== ESTADO DE UI ====================
  selectedUser: UserExtended | null = null;
  userToDelete: UserExtended | null = null;
  viewedDocuments = new Set<number>();
  showDocumentsDialog = false;
  showDeleteDialog = false;
  openMenuId: number | null = null;

  // ==================== DATOS ====================
  users: UserExtended[] = [];
  isLoading = false;

  // ==================== SERVICIOS ====================
  private documentService = inject(DocumentService);
  private alertService = inject(AlertService);
  private userService: UserService;
  private apiService: Api;

  constructor(
    alertService: AlertService,
    userService: UserService,
    apiService: Api
  ) {
    this.alertService = alertService;
    this.userService = userService;
    this.apiService = apiService;
  }

  // ==================== CICLO DE VIDA ====================

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== ALERTAS REACTIVAS ====================

  /** Stream de alertas para mostrar en UI */
  public getAlerts$(): Observable<AlertConfig[]> {
    return this.alertService.alerts$;
  }

  // ==================== CARGA DE DATOS ====================

  /** Carga usuarios y sus documentos asociados */
  loadUsers(): void {
    this.isLoading = true;

    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: User[]) => {
          this.users = users.map(user => this.convertToUserExtended(user));
          this.isLoading = false;
          this.loadUserDocuments();
        },
        error: () => {
          this.alertService.error('Error', 'No se pudieron cargar los usuarios', 5000);
          this.isLoading = false;
        }
      });
  }

  /**
   * Extiende modelo `User` a `UserExtended` con datos calculados.
   */
  private convertToUserExtended(user: User): UserExtended {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      created_at: user.created_at || new Date().toISOString(),
      last_login: null,
      is_active: user.is_active ?? true,
      documentsCount: 0,
      lastActivity: 'Sin actividad',
      documents: [],
      profile_photo_url: (user as any).profile_photo_url || null
    };
  }

  /** Asocia documentos a cada usuario y calcula última actividad */
  private loadUserDocuments(): void {
    this.apiService.getAllDocumentsMetadata(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documents: DocumentWithMetadata[]) => {
          this.users.forEach(user => {
            const userDocs = documents.filter(doc => doc.user_id === user.id);
            user.documents = userDocs;
            user.documentsCount = userDocs.length;

            if (userDocs.length > 0) {
              const lastDoc = userDocs.reduce((latest, current) =>
                new Date(current.upload_date) > new Date(latest.upload_date) ? current : latest
              );
              user.lastActivity = this.formatLastActivity(lastDoc.upload_date);
            } else {
              user.lastActivity = 'Sin actividad';
            }
          });
        },
        error: () => {
          // Silencioso: no afecta funcionalidad principal
        }
      });
  }

  // ==================== FORMATEO DE TIEMPO ====================

  private pluralize(value: number, singular: string): string {
    return `${value} ${singular}${value !== 1 ? 's' : ''}`;
  }

  /** Formato relativo de última actividad (ej: "Hace 5 minutos", "Ayer") */
  private formatLastActivity(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Justo ahora';
    if (diffMins < 60) return `Hace ${this.pluralize(diffMins, 'minuto')}`;
    if (diffHours < 24) return `Hace ${this.pluralize(diffHours, 'hora')}`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 30) return `Hace ${this.pluralize(diffDays, 'día')}`;

    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ==================== FILTRADO DINÁMICO ====================

  /** Usuarios filtrados por nombre, email, rol y estado */
  get filteredUsers(): UserExtended[] {
    return this.users.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesRole = this.roleFilter === 'all' || user.role === this.roleFilter;
      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && user.is_active) ||
        (this.statusFilter === 'inactive' && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  // ==================== ESTADÍSTICAS ====================

  get stats() {
    return [
      { label: 'Total Usuarios', value: this.users.length, icon: 'User', color: 'bg-blue-500' },
      { label: 'Usuarios Activos', value: this.users.filter(u => u.is_active).length, icon: 'UserCheck', color: 'bg-[#02ab74]' },
      { label: 'Usuarios Inactivos', value: this.users.filter(u => !u.is_active).length, icon: 'UserX', color: 'bg-orange-500' },
      { label: 'Administradores', value: this.users.filter(u => u.role === 'admin').length, icon: 'Shield', color: 'bg-[#7209b7]' }
    ];
  }

  // ==================== ACCIONES DE USUARIO ====================

  /** Cambia rol de usuario */
  handleChangeRole(userId: number, newRole: UserRole): void {
    this.userService.updateUserRole(userId, { new_role: newRole })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === userId);
          if (index !== -1) {
            this.users[index] = { ...this.users[index], role: updatedUser.new_role as UserRole };
          }
          this.alertService.success('Rol actualizado exitosamente', '', 3000);
        },
        error: () => {
          this.alertService.error('Error', 'No se pudo actualizar el rol', 3000);
          this.loadUsers();
        }
      });
  }

  /** Activa o desactiva usuario */
  handleToggleStatus(userId: number): void {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    const newStatus = !user.is_active;
    const update$ = newStatus
      ? this.userService.activateUser(userId)
      : this.userService.deactivateUser(userId);

    update$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.users = this.users.map(u =>
            u.id === userId ? { ...u, is_active: newStatus } : u
          );
          this.alertService[newStatus ? 'success' : 'warning'](
            `Usuario ${newStatus ? 'Activado' : 'Desactivado'}`, '', 3000
          );
        },
        error: () => {
          this.alertService.error('Error', 'No se pudo cambiar el estado del usuario', 3000);
        }
      });
  }

  /** Muestra documentos del usuario */
  handleViewDocuments(user: UserExtended): void {
    this.selectedUser = user;
    this.showDocumentsDialog = true;
  }

  /** Abre diálogo de confirmación para eliminar */
  openDeleteDialog(user: UserExtended): void {
    this.userToDelete = user;
    this.showDeleteDialog = true;
  }

  /** Elimina usuario permanentemente */
  handleDeleteUser(): void {
    if (!this.userToDelete) return;

    this.userService.deleteUser(this.userToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== this.userToDelete!.id);
          this.alertService.success('Usuario Eliminado', 'Usuario eliminado exitosamente', 3000);
          this.userToDelete = null;
          this.showDeleteDialog = false;
        },
        error: () => {
          this.alertService.error('Error', 'No se pudo eliminar el usuario', 5000);
          this.showDeleteDialog = false;
        }
      });
  }

  // ==================== UI Y ESTILOS ====================

  /** Ícono según tipo de alerta */
  getDefaultIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'CheckCircle',
      error: 'XCircle',
      warning: 'AlertTriangle',
      info: 'Info'
    };
    return icons[type] || 'Info';
  }

  /** Iniciales del usuario para avatar */
  getUserInitials(name: string): string {
    if (!name) return '??';
    const names = name.split(' ');
    return names.length >= 2
      ? (names[0][0] + names[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  /** Toggle menú de acciones */
  toggleMenu(userId: number): void {
    this.openMenuId = this.openMenuId === userId ? null : userId;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  /** Clases CSS para badge de rol */
  getRoleBadgeClasses(role: string): string {
    const base = 'px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 ease-in-out';
    const map: Record<string, string> = {
      admin: 'bg-[#7209b7] text-white',
      user: 'bg-gray-100 text-gray-700'
    };
    return `${base} ${map[role] || 'bg-gray-200 text-gray-600'}`;
  }

  /** Etiqueta legible del rol */
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      user: 'Usuario'
    };
    return labels[role] || 'Desconocido';
  }

  /** Formato legible de tamaño de archivo */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ==================== VISUALIZACIÓN DE DOCUMENTOS ====================

  /** Abre documento en nueva pestaña */
  viewDocument(doc: DocumentWithMetadata): void {
    this.documentService.downloadDocument(+doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          this.viewedDocuments.add(+doc.id);
        },
        error: () => {
          this.alertService.error('No se pudo visualizar el documento.', '');
        }
      });
  }
}