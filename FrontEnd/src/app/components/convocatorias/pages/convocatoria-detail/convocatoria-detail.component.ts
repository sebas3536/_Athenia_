/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @angular-eslint/prefer-inject */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, takeUntil } from 'rxjs';
import {
  Collaborator,
  Convocatoria,
  ConvocatoriaDocument,
} from 'src/app/domain/models/convocatorias.model';
import { ProgressCardComponent } from '../../components/progress-card/progress-card.component';
import {
  DocumentItemComponent,
  FileUploadEvent,
  FileDownloadEvent,
} from '../../components/document-item/document-item.component';
import {
  AddDocumentDialogComponent,
  AddDocumentData,
} from '../../dialogs/add-document-dialog/add-document-dialog.component';
import {
  AddCollaboratorData,
  AddCollaboratorDialogComponent,
} from '../../dialogs/add-collaborator-dialog/add-collaborator-dialog.component';
import {
  EditDatesDialogComponent,
  UpdateDatesData,
} from '../../dialogs/edit-dates-dialog/edit-dates-dialog.component';
import { ConvocatoriasUtilsService } from '../../utils/date.utils';
import { ConvocatoriasService } from '../../services/convocatorias.service';
import { CollaboratorsService } from '../../services/collaborators.service';
import { DocumentsService } from '../../services/documents.service';
import { GuidesService } from '../../services/guides.service';
import { ProgressUtilsService } from '../../utils/progress.utils';
import { RoleUtilsService } from '../../utils/role.utils';
import { CollaboratorsSectionComponent } from '../../components/collaborators-section/collaborators-section.component';
import { UserService } from 'src/app/services/api/user-service';
import { User } from 'src/app/domain/models/user.model';
import { Auth } from 'src/app/components/authentication/auth/auth';
import { ConvocatoriasPermissionsService } from '../../services/convocatorias-permissions.service';
import { HistoryTableComponent } from '../../components/history-table/history-table.component';
import { AlertService } from '@shared/components/alert/alert.service';

@Component({
  selector: 'app-convocatoria-detail',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ProgressCardComponent,
    DocumentItemComponent,
    AddDocumentDialogComponent,
    AddCollaboratorDialogComponent,
    EditDatesDialogComponent,
    CollaboratorsSectionComponent,
    HistoryTableComponent,
  ],
  templateUrl: './convocatoria-detail.component.html',
  styleUrl: './convocatoria-detail.component.css',
})
export class ConvocatoriaDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  convocatoria?: Convocatoria;
  convocatoriaId = '';
  isLoading = false;
  userRole: 'admin' | 'user' = 'user';

  // Diálogos
  isAddDocumentDialogOpen = false;
  isAddCollaboratorDialogOpen = false;
  isEditDatesDialogOpen = false;

  // Colaboradores
  availableUsers: User[] = [];
  collaborators: Collaborator[] = [];
  history: any[] = [];

  constructor(
    private convocatoriasService: ConvocatoriasService,
    private collaboratorsService: CollaboratorsService,
    private userService: UserService,
    private documentsService: DocumentsService,
    private guidesService: GuidesService,
    private permissionsService: ConvocatoriasPermissionsService,
    private authService: Auth,
    private route: ActivatedRoute,
    private router: Router,
    public utils: ConvocatoriasUtilsService,
    public progressUtils: ProgressUtilsService,
    public roleUtils: RoleUtilsService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.userRole = (currentUser?.role as 'admin' | 'user') || 'user';

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.convocatoriaId = params['id'];
      this.loadConvocatoria();
      this.loadCollaborators();
      this.loadAvailableUsers();

      setTimeout(() => {
        this.loadHistory();
      }, 300);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================================================
  // PERMISOS
  // =========================================================
  get canEditConvocatoria(): boolean {
    return this.permissionsService.can('canEdit', parseInt(this.convocatoriaId));
  }

  get canCreateChecklistItems(): boolean {
    return this.permissionsService.can('canCreateChecklistItems', parseInt(this.convocatoriaId));
  }

  get canDeleteChecklistItems(): boolean {
    return this.permissionsService.can('canDeleteChecklistItems', parseInt(this.convocatoriaId));
  }

  get canUploadDocuments(): boolean {
    return this.permissionsService.can('canUploadDocuments', parseInt(this.convocatoriaId));
  }

  get canAddCollaborators(): boolean {
    return this.permissionsService.can('canAddCollaborators', parseInt(this.convocatoriaId));
  }

  get usersNotInCollaborators(): User[] {
    if (!this.collaborators || this.collaborators.length === 0) {
      return this.availableUsers;
    }

    const collaboratorEmails = new Set(this.collaborators.map((c) => c.email.toLowerCase()));

    return this.availableUsers.filter((user) => !collaboratorEmails.has(user.email.toLowerCase()));
  }

  // ==========================================
  // LOAD DATA
  // ==========================================
  private loadHistory(): void {
    this.convocatoriasService
      .getHistory(this.convocatoriaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (historyData) => {
          if (!historyData || historyData.length === 0) {
            this.history = [];
            return;
          }

          this.history = historyData.map((h: any) => ({
            id: h.id || Math.random(),
            documentName: h.document_name || h.documentName || 'Sin nombre',
            action: h.action || 'unknown',
            user: h.user_name || h.user || 'Usuario desconocido',
            date: h.timestamp || h.date || new Date(),
            projectName: this.convocatoria?.name || 'Convocatoria',
          }));

          this.history = [...this.history];
        },
        error: (error) => {
          console.error('❌ Error loading history:', error);
          this.history = [];
        },
      });
  }

  private reloadAll(): void {
    this.convocatoriasService.refreshConvocatorias();
    setTimeout(() => {
      this.loadHistory();
    }, 500);
  }

  private loadConvocatoria(): void {
    this.isLoading = true;
    this.convocatoriasService.convocatorias$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (convocatorias) => {
        this.convocatoria = convocatorias.find((c) => String(c.id) === String(this.convocatoriaId));
        this.isLoading = false;

        if (!this.convocatoria) {
          this.alertService.error('Convocatoria no encontrada', '');
          this.backToList();
        }
      },
      error: (error) => {
        console.error('Error loading convocatoria:', error);
        this.alertService.error('No se pudo cargar la convocatoria', '');
        this.isLoading = false;
      },
    });
  }

  loadCollaborators(): void {
    if (!this.convocatoriaId) {
      return;
    }

    this.collaboratorsService
      .getCollaborators(this.convocatoriaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (collaborators) => {
          this.collaborators = collaborators;
        },
        error: (error) => {
          console.error('Error loading collaborators:', error);
          this.collaborators = [];
        },
      });
  }

  loadAvailableUsers(): void {
    this.isLoading = true;
    this.userService
      .getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: User[]) => {
          this.availableUsers = users.map((user) => ({
            ...user,
            created_at: user.created_at || new Date().toISOString(),
            last_login: user.last_login || null,
            documentsCount: 0,
            lastActivity: '',
            documents: [],
            status: user.is_active ? 'active' : 'inactive',
            profile_photo_url: user.profile_photo_url || null,
          }));
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading available users:', err);
          this.isLoading = false;
        },
      });
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  backToList(): void {
    this.router.navigate(['/applications']);
  }

  // ==========================================
  // DIÁLOGOS
  // ==========================================

  openAddDocumentDialog(): void {
    if (!this.canCreateChecklistItems) {
      this.alertService.warning(
        'Acceso Denegado',
        'No tienes permisos para crear items del checklist'
      );
      return;
    }
    this.isAddDocumentDialogOpen = true;
  }

  openAddCollaboratorDialog(): void {
    if (!this.canAddCollaborators) {
      this.alertService.warning('Acceso Denegado', 'No tienes permisos para agregar colaboradores');
      return;
    }
    this.isAddCollaboratorDialogOpen = true;
  }

  openEditDatesDialog(): void {
    if (!this.canEditConvocatoria) {
      this.alertService.warning('Acceso Denegado', 'No tienes permisos para editar las fechas');
      return;
    }
    this.isEditDatesDialogOpen = true;
  }

  // ==========================================
  // DOCUMENT MANAGEMENT
  // ==========================================

  onAddDocument(data: AddDocumentData): void {
    if (!this.canCreateChecklistItems) {
      this.alertService.warning('Acceso Denegado', 'No tienes permisos para crear documentos');
      return;
    }

    if (!data || !data.name || data.name.trim() === '') {
      this.alertService.error('Error', 'Por favor ingrese un nombre para el documento');
      return;
    }

    this.isLoading = true;
    const hasFile = data.hasDocument && data.file;

    if (!hasFile) {
      this.createEmptyChecklist(data.name.trim());
      return;
    }

    if (data.file) {
      this.createChecklistAndUploadFile(data.name.trim(), data.file);
    }
  }

  private createEmptyChecklist(name: string): void {
    this.convocatoriasService
      .addDocumentToChecklist(this.convocatoriaId, name)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isAddDocumentDialogOpen = false;
          this.alertService.success('agregado al checklist en estado PENDIENTE', ``);
          this.updateAfterChange('addDocument');
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error creating empty checklist:', error);
          const errorMsg = error?.error?.detail || 'No se pudo agregar el documento';
          this.alertService.error('Error', errorMsg);
          this.isLoading = false;
        },
      });
  }

  private createChecklistAndUploadFile(name: string, file: File): void {
    this.convocatoriasService
      .addDocumentToChecklist(this.convocatoriaId, name, file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isAddDocumentDialogOpen = false;
          this.alertService.success('Archivo subido exitosamente', ``);
          this.convocatoriasService.refreshConvocatorias();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error creating checklist with file:', error);
          const errorMsg = error?.error?.detail || 'No se pudo agregar el documento con archivo';
          this.alertService.error('Error', errorMsg);
          this.isLoading = false;
        },
      });
  }

  onUploadFile(event: FileUploadEvent): void {
    if (event.type === 'document') {
      this.uploadDocumentToExistingChecklist(event);
      setTimeout(() => {
        this.reloadAll();
      }, 800);
    } else if (event.type === 'guide') {
      this.uploadGuide(event);
    }
  }

  private uploadDocumentToExistingChecklist(event: FileUploadEvent): void {
    if (!this.canUploadDocuments) {
      this.alertService.warning('No tienes permisos para subir documentos', '');
      return;
    }
    if (!event.file || !event.docId) {
      this.alertService.error('Archivo o documento no disponible', '');
      return;
    }
    this.isLoading = true;
    this.convocatoriasService
      .uploadDocumentToExistingChecklist(this.convocatoriaId, event.docId, event.file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.convocatoria) {
            const docIndex = this.convocatoria.documents.findIndex((d) => d.id === event.docId);
            if (docIndex !== -1) {
              this.convocatoria.documents[docIndex].status = 'completed';
              this.convocatoria.documents[docIndex].fileName = event.file.name;
              this.convocatoria.documents[docIndex].uploadedAt = new Date();
              this.convocatoria = { ...this.convocatoria };
            }
          }
          this.alertService.success('Archivo subido exitosamente.', ``);

          setTimeout(() => {
            this.convocatoriasService.refreshConvocatorias();
          }, 500);

          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error uploading document:', error);
          const errorMsg = error?.error?.detail || 'No se pudo subir el documento';
          this.alertService.error('Error', errorMsg);
          this.isLoading = false;
        },
      });
  }

  private uploadGuide(event: FileUploadEvent): void {
    if (!this.canDeleteChecklistItems) {
      this.alertService.warning('Solo administradores pueden subir guías', '');
      return;
    }

    if (!event.file || !event.docId) {
      this.alertService.error('Archivo o documento no disponible', '');
      return;
    }

    this.isLoading = true;

    this.guidesService
      .uploadGuideDocument(this.convocatoriaId, event.docId, event.file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (this.convocatoria) {
            const docIndex = this.convocatoria.documents.findIndex((d) => d.id === event.docId);
            if (docIndex !== -1) {
              const updatedDoc = {
                ...this.convocatoria.documents[docIndex],
                guide: response.guide,
              };
              this.convocatoria.documents[docIndex] = updatedDoc;
              this.convocatoria = { ...this.convocatoria };
            }
          }

          this.alertService.success('Guía subida correctamente', '');
          this.isLoading = false;
        },
        error: (error) => {
          this.alertService.error('Error', error?.error?.detail || 'Error al subir');
          this.isLoading = false;
        },
      });
  }

  onDownloadFile(event: FileDownloadEvent): void {
    if (event.type === 'document') {
      this.downloadDocument(event.document);
    } else if (event.type === 'guide') {
      this.downloadGuide(event.document);
    }
  }

  private downloadDocument(doc: ConvocatoriaDocument): void {
    if (doc.file) {
      const url = URL.createObjectURL(doc.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || 'documento';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (doc.document_id) {
      this.isLoading = true;
      this.documentsService
        .downloadDocumentConvocatorias(this.convocatoriaId, doc.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (blob) => {
            this.documentsService.triggerDownload(blob, doc.fileName || 'documento');
            this.isLoading = false;
          },
          error: (error) => {
            let errorMsg = 'No se pudo descargar el documento';
            if (error.status === 404) errorMsg = 'El documento no existe o fue eliminado';
            else if (error.status === 403)
              errorMsg = 'No tienes permiso para descargar este documento';
            this.alertService.error('Error', errorMsg);
            this.isLoading = false;
          },
        });
    } else {
      this.alertService.error('Este documento no está disponible para descargar', '');
    }
  }

  private downloadGuide(doc: ConvocatoriaDocument): void {
    if (!doc.guide?.id) {
      this.alertService.error('Este documento no tiene guía', '');
      return;
    }

    this.isLoading = true;
    this.guidesService
      .downloadGuideDocument(this.convocatoriaId, doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.documentsService.triggerDownload(blob, doc.guide?.fileName || 'guia');
          this.isLoading = false;
        },
        error: () => {
          this.alertService.error('No se pudo descargar la guía', '');
          this.isLoading = false;
        },
      });
  }

  async onDeleteDocument(docId: string): Promise<void> {
    if (!this.canDeleteChecklistItems) {
      this.alertService.warning('No tienes permisos para borrar documentos', '');
      return;
    }
    const confirmed = await this.alertService.confirm(
      `¿Estás seguro de eliminar?\n\nEsta acción eliminará el documento y la guía asociada (si existe).`,
      ``
    );
    const documentToDelete = this.convocatoria?.documents.find((d) => d.id === docId);
    if (!documentToDelete) {
      this.alertService.error('Documento no encontrado', '');
      return;
    }

    if (!confirmed) return;

    this.isLoading = true;

    this.convocatoriasService
      .deleteDocument(this.convocatoriaId, docId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.convocatoria) {
            this.convocatoria.documents = this.convocatoria.documents.filter((d) => d.id !== docId);
            this.convocatoria = { ...this.convocatoria };
          }

          this.alertService.success(`"Eliminado exitosamente`, '');
          this.updateAfterChange('deleteDocument');
          this.isLoading = false;
        },
        error: (error) => {
          let errorMsg = 'No se pudo eliminar el documento';
          if (error.status === 404) errorMsg = 'El documento no existe o ya fue eliminado';
          else if (error.status === 403)
            errorMsg = 'No tienes permiso para eliminar este documento';
          else if (error?.error?.detail) errorMsg = error.error.detail;

          this.alertService.error('Error', errorMsg);
          this.isLoading = false;
        },
      });
  }

  // =========================================================
  // CONFIRMACIÓN PARA ELIMINAR GUÍA
  // =========================================================
  async onDeleteGuide(docId: string): Promise<void> {
    if (!this.canDeleteChecklistItems) {
      this.alertService.warning('No tienes permisos para borrar guías', '');
      return;
    }

    const confirmed = await this.alertService.confirm(
      `¿Estás seguro de eliminar esta guía asociada al documento?`,
      ``
    );

    if (!confirmed) return;

    this.isLoading = true;

    this.guidesService
      .deleteGuideDocument(this.convocatoriaId, docId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertService.success('Guía eliminada exitosamente', '');
          if (this.convocatoria) {
            const docIndex = this.convocatoria.documents.findIndex((d) => d.id === docId);
            if (docIndex !== -1) {
              this.convocatoria.documents[docIndex].guide = undefined;
              this.convocatoria = { ...this.convocatoria };
            }
          }
          this.isLoading = false;
        },
        error: () => {
          this.alertService.error('Error', 'No se pudo eliminar la guía');
          this.isLoading = false;
        },
      });
  }

  // ==========================================
  // COLLABORATORS MANAGEMENT
  // ==========================================

  onAddCollaborators(data: AddCollaboratorData): void {
    if (!this.canAddCollaborators) {
      this.alertService.warning('No tienes permisos para agregar colaboradores', '');
      return;
    }

    this.isLoading = true;

    this.collaboratorsService
      .addCollaborators(this.convocatoriaId, data.userIds, data.role)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isAddCollaboratorDialogOpen = false;
          this.alertService.success('Colaborador agregado exitosamente', ``);
          this.updateAfterChange('addCollaborators');
          this.isLoading = false;
        },
        error: (errorMsg) => {
          this.alertService.error('Error', errorMsg);
          this.isLoading = false;
        },
      });
  }

  // =========================================================
  // CONFIRMACIÓN PARA ELIMINAR COLABORADOR
  // =========================================================
  async onRemoveCollaborator(collaboratorId: string): Promise<void> {
    if (!this.canAddCollaborators) {
      this.alertService.warning('No tienes permisos para quitar colaboradores', '');
      return;
    }
    const confirmed = await this.alertService.confirm(
      `¿Estás seguro de eliminar este colaborador del proyecto?`,
      ``
    );
    if (!confirmed) return;

    this.isLoading = true;

    this.collaboratorsService
      .removeCollaborator(this.convocatoriaId, collaboratorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertService.success('Colaborador eliminado exitosamente', '');
          this.loadCollaborators();
          this.loadAvailableUsers();
          this.isLoading = false;
        },
        error: () => {
          this.alertService.error('No se pudo eliminar el colaborador', '');
          this.isLoading = false;
        },
      });
  }

  // ==========================================
  // DATES MANAGEMENT
  // ==========================================

  onUpdateDates(data: UpdateDatesData): void {
    if (!this.convocatoria) return;

    if (!this.canEditConvocatoria) {
      this.alertService.warning('No tienes permisos para editar las fechas', '');
      return;
    }
    this.isLoading = true;
    const payload = {
      name: this.convocatoria.name,
      description: this.convocatoria.description,
      start_date: data.startDate,
      end_date: data.endDate,
    };

    this.convocatoriasService
      .update(this.convocatoriaId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedConvocatoria) => {
          this.convocatoria = updatedConvocatoria;
          this.isEditDatesDialogOpen = false;
          this.alertService.success('Fechas actualizadas exitosamente', '');
          this.isLoading = false;
        },
        error: () => {
          this.alertService.error('No se pudieron actualizar las fechas', '');
          this.isLoading = false;
        },
      });
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  trackByDocumentId(index: number, doc: ConvocatoriaDocument): string {
    return doc.id;
  }

  isAdmin(): boolean {
    return true;
  }

  private updateAfterChange(actionName: string): void {
    this.reloadAll();
    setTimeout(() => {
      if (actionName.includes('Collaborator')) {
        this.loadCollaborators();
        this.loadAvailableUsers();
      }
    }, 1000);
  }
}
