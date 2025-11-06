/* eslint-disable @angular-eslint/prefer-inject */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, takeUntil } from 'rxjs';

import { Convocatoria, ConvocatoriaDocument, CreateConvocatoriaData } from 'src/app/domain/models/convocatorias.model';
import { ConvocatoriaCardComponent } from '../../components/convocatoria-card/convocatoria-card.component';
import { CreateConvocatoriaDialogComponent } from '../../dialogs/create-convocatoria-dialog/create-convocatoria-dialog.component';
import { ConvocatoriasService } from '../../services/convocatorias.service';
import { Auth } from 'src/app/components/authentication/auth/auth';
import { ConvocatoriasPermissionsService } from '../../services/convocatorias-permissions.service';
import { AlertService } from '@shared/components/alert/alert.service';

@Component({
  selector: 'app-convocatorias-list',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ConvocatoriaCardComponent,
    CreateConvocatoriaDialogComponent,
  ],
  templateUrl: './convocatorias-list.component.html',
  styleUrls: ['./convocatorias-list.component.css']
})
export class ConvocatoriasListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  convocatorias: Convocatoria[] = [];
  isCreateDialogOpen = false;
  isLoading = false;
  userRole: 'admin' | 'user' = 'user';

  constructor(
    private convocatoriasService: ConvocatoriasService,
    private permissionsService: ConvocatoriasPermissionsService,
    private authService: Auth,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private alertService: AlertService
  ) {}

  // -------------------------------
  // 🔹 Ciclo de vida
  // -------------------------------
  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.userRole = (currentUser?.role as 'admin' | 'user') || 'user';
    this.loadConvocatorias();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -------------------------------
  // 🔹 Permisos
  // -------------------------------
  get canCreateConvocatorias(): boolean {
    return this.permissionsService.can('canCreate');
  }

  get canDeleteConvocatorias(): boolean {
    return this.permissionsService.can('canDelete');
  }

  // -------------------------------
  // 🔹 Cargar convocatorias
  // -------------------------------
  loadConvocatorias(): void {
    this.isLoading = true;
    this.convocatoriasService.convocatorias$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (convocatorias) => {
          this.convocatorias = convocatorias;
          this.isLoading = false;
        },
        error: () => {
          this.alertService.error('Error', 'No se pudieron cargar las convocatorias');
          this.isLoading = false;
        }
      });
  }

  // -------------------------------
  // 🔹 Acciones
  // -------------------------------
  onSelectConvocatoria(convId: string): void {
    this.router.navigate([convId], { relativeTo: this.activatedRoute });
  }

  openCreateDialog(): void {
    if (!this.canCreateConvocatorias) {
      this.alertService.warning('Acceso Denegado', 'No tienes permisos para crear convocatorias');
      return;
    }
    this.isCreateDialogOpen = true;
  }

  onCreateConvocatoria(data: CreateConvocatoriaData): void {
    if (!this.canCreateConvocatorias) {
      this.alertService.warning('Acceso Denegado', 'No tienes permisos para crear convocatorias');
      return;
    }

    this.isLoading = true;
    this.convocatoriasService.create(
      data.name,
      data.description,
      data.startDate,
      data.endDate
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.isCreateDialogOpen = false;
        this.alertService.success('Convocatoria creada exitosamente', '');
        this.isLoading = false;
      },
      error: () => {
        this.alertService.error('No se pudo crear la convocatoria', '');
        this.isLoading = false;
      }
    });
  }

  // -------------------------------
  // 🔹 Eliminar convocatoria con confirmación
  // -------------------------------
  async onDeleteConvocatoria(conv: Convocatoria): Promise<void> {
    if (!this.canDeleteConvocatorias) {
      this.alertService.warning('No tienes permisos para eliminar convocatorias', '');
      return;
    }

    const confirmed = await this.alertService.confirm(
      `¿Estás seguro de eliminar "${conv.name}"?\n\nEsta acción no se puede deshacer.`,
      ``
    )

    if (!confirmed) return;

    this.isLoading = true;
    this.convocatoriasService.delete(conv.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.convocatorias = this.convocatorias.filter(c => c.id !== conv.id);
          this.alertService.success('La convocatoria "${conv.name}" fue eliminada.', ``);
          this.isLoading = false;
        },
        error: () => {
          this.alertService.error('No se pudo eliminar la convocatoria', '');
          this.isLoading = false;
        }
      });
  }

  // -------------------------------
  // 🔹 Utilidades
  // -------------------------------
  trackByConvocatoriaId(index: number, conv: Convocatoria | ConvocatoriaDocument): string {
    return conv.id;
  }
}
