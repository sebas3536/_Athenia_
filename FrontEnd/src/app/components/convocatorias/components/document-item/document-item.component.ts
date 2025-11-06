/* eslint-disable @angular-eslint/prefer-inject */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ConvocatoriaDocument } from 'src/app/domain/models/convocatorias.model';
import { ConvocatoriasUtilsService } from '../../utils/date.utils';
import { DocumentCacheService } from '../../services/document-cache.service';

/**
 * Evento emitido al seleccionar un archivo para subir.
 */
export interface FileUploadEvent {
  docId: string;
  file: File;
  type: 'document' | 'guide';
}

/**
 * Evento emitido al solicitar la descarga de un archivo.
 */
export interface FileDownloadEvent {
  document: ConvocatoriaDocument;
  type: 'document' | 'guide';
}

/**
 * Componente para mostrar y gestionar un documento de convocatoria,
 * incluyendo su archivo principal, guía asociada y operaciones de carga/descarga/eliminación.
 */
@Component({
  selector: 'app-document-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './document-item.component.html',
  styleUrl: './document-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentItemComponent implements OnInit, OnChanges {
  // ==================================================================
  // INPUTS
  // ==================================================================

  /** Documento principal de la convocatoria */
  @Input({ required: true }) document!: ConvocatoriaDocument;

  /** ID de la convocatoria (necesario para caché) */
  @Input() convocatoriaId?: string;

  /** Indica si el componente está en estado de carga */
  @Input() isLoading = false;

  /** Permisos de acción */
  @Input() canDeleteDocument = true;
  @Input() canUploadDocument = true;
  @Input() canDeleteGuide = true;

  // ==================================================================
  // OUTPUTS
  // ==================================================================

  @Output() uploadFile = new EventEmitter<FileUploadEvent>();
  @Output() downloadFile = new EventEmitter<FileDownloadEvent>();
  @Output() deleteDocument = new EventEmitter<string>();

  @Output() uploadGuide = new EventEmitter<FileUploadEvent>();
  @Output() downloadGuide = new EventEmitter<FileDownloadEvent>();
  @Output() deleteGuide = new EventEmitter<string>();

  // ==================================================================
  // VIEWCHILD
  // ==================================================================

  @ViewChild('documentFileInput') documentFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('guideFileInput') guideFileInput!: ElementRef<HTMLInputElement>;

  // ==================================================================
  // ESTADO LOCAL
  // ==================================================================

  /** Controla la visibilidad del menú de opciones de guía */
  showGuideOptions = false;

  /** Documento combinado: datos del input + caché */
  private cachedDocument: ConvocatoriaDocument | null = null;

  // ==================================================================
  // CONSTRUCTOR
  // ==================================================================

  constructor(
    public utils: ConvocatoriasUtilsService,
    private documentCacheService: DocumentCacheService,
    private cdr: ChangeDetectorRef
  ) {}

  // ==================================================================
  // LIFECYCLE HOOKS
  // ==================================================================

  /** Inicializa el componente y carga datos desde caché */
  ngOnInit(): void {
    this.loadCachedDocument();
  }

  /**
   * Detecta cambios en @Input, especialmente en `document`.
   * Actualiza el caché y fuerza detección de cambios si es necesario.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document']) {
      this.loadCachedDocument();
      this.cdr.markForCheck();
    }
  }

  // ==================================================================
  // CACHÉ DE DATOS
  // ==================================================================

  /**
   * Combina el documento recibido por @Input con datos almacenados en caché.
   * Prioriza los datos del input actual.
   */
  private loadCachedDocument(): void {
    if (!this.convocatoriaId || !this.document.id) {
      this.cachedDocument = this.document;
      this.cdr.markForCheck();
      return;
    }

    const cached = this.documentCacheService.getCachedDocument(
      this.convocatoriaId,
      this.document.id
    );

    if (cached) {
      this.cachedDocument = {
        ...cached,
        ...this.document,
        fileName: this.document.fileName || cached.fileName || '',
        guide: this.document.guide || cached.guide
      };
    } else {
      this.cachedDocument = this.document;
      this.documentCacheService.cacheDocument(this.convocatoriaId, this.document);
    }

    this.cdr.markForCheck();
  }

  // ==================================================================
  // GETTERS (basados en cachedDocument)
  // ==================================================================

  /** Indica si el documento está completado */
  get isCompleted(): boolean {
    return this.cachedDocument?.status === 'completed';
  }

  /** Indica si el documento está pendiente */
  get isPending(): boolean {
    return this.cachedDocument?.status === 'pending';
  }

  /** Fecha de subida formateada */
  get formattedDate(): string {
    return this.cachedDocument?.uploadedAt
      ? this.utils.formatDate(this.cachedDocument.uploadedAt.toISOString())
      : '';
  }

  /** Indica si existe una guía asociada */
  get hasGuide(): boolean {
    return !!this.cachedDocument?.guide;
  }

  /** Nombre del archivo de guía */
  get guideFileName(): string {
    return this.cachedDocument?.guide?.fileName || '';
  }

  /** Nombre descriptivo del documento */
  get documentName(): string {
    return this.cachedDocument?.name || this.document.name || '';
  }

  /** Nombre del archivo principal (o undefined si no hay) */
  get documentFileName(): string | undefined {
    const fileName = this.cachedDocument?.fileName;
    return fileName && fileName !== '' ? fileName : undefined;
  }

  /** Estado actual del documento */
  get documentStatus(): string {
    return this.cachedDocument?.status || 'pending';
  }

  /** Usuario que subió el documento */
  get documentUploadedBy(): string {
    return this.cachedDocument?.uploadedBy || 'Usuario desconocido';
  }

  // ==================================================================
  // MANEJADORES DE SUBIDA DE ARCHIVOS
  // ==================================================================

  /** Abre el selector de archivo para documento principal */
  onUploadDocumentClick(): void {
    if (!this.canUploadDocument) return;
    this.documentFileInput?.nativeElement?.click();
  }

  /** Abre el selector de archivo para guía */
  onUploadGuideClick(): void {
    if (!this.canDeleteGuide) return;
    this.guideFileInput?.nativeElement?.click();
  }

  /**
   * Procesa la selección de archivo y emite el evento correspondiente.
   */
  onFileSelected(event: Event, type: 'document' | 'guide'): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (!this.document.id) return;

    const uploadEvent: FileUploadEvent = {
      docId: this.document.id,
      file,
      type
    };

    if (type === 'document') {
      this.uploadFile.emit(uploadEvent);
    } else {
      this.uploadGuide.emit(uploadEvent);
    }

    input.value = '';
  }

  // ==================================================================
  // MANEJADORES DE DESCARGA
  // ==================================================================

  /** Descarga el documento principal o guía */
  onDownloadClick(type: 'document' | 'guide' = 'document'): void {
    const doc = this.cachedDocument || this.document;
    this.downloadFile.emit({ document: doc, type });
  }

  /** Descarga específicamente la guía */
  onDownloadGuideClick(): void {
    const doc = this.cachedDocument || this.document;
    this.downloadGuide.emit({ document: doc, type: 'guide' });
  }

  // ==================================================================
  // MANEJADORES DE ELIMINACIÓN
  // ==================================================================

  /** Elimina el documento principal tras confirmación */
  onDeleteClick(): void {
    if (!this.canDeleteDocument) return;

    const name = this.documentName;
    if (confirm(`¿Estás seguro de eliminar "${name}"?`)) {
      this.deleteDocument.emit(this.document.id);
    }
  }

  /** Elimina la guía asociada */
  onDeleteGuideClick(): void {
    if (!this.canDeleteGuide) return;

    const name = this.documentName;
    if (confirm(`¿Estás seguro de eliminar la guía de "${name}"?`)) {
      this.deleteGuide.emit(this.document.id);
      this.showGuideOptions = false;

      if (this.convocatoriaId) {
        this.documentCacheService.updateDocumentData(
          this.convocatoriaId,
          this.document.id,
          { guide: undefined }
        );
        this.cdr.markForCheck();
      }
    }
  }

  // ==================================================================
  // UI HELPERS
  // ==================================================================

  /** Alterna la visibilidad del menú de guía */
  toggleGuideOptions(): void {
    this.showGuideOptions = !this.showGuideOptions;
  }

  /** Cierra el menú de opciones de guía */
  closeGuideOptions(): void {
    this.showGuideOptions = false;
  }

  /**
   * Devuelve un ícono y nombre amigable según la extensión del archivo.
   */
  getDocumentType(fileName?: string): string {
    if (!fileName) return 'Archivo';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const types: Record<string, string> = {
      pdf: 'PDF',
      doc: 'Word',
      docx: 'Word',
      xls: 'Excel',
      xlsx: 'Excel',
      ppt: 'PowerPoint',
      pptx: 'PowerPoint',
      txt: 'Texto',
      jpg: 'Imagen',
      jpeg: 'Imagen',
      png: 'Imagen',
      zip: 'Comprimido',
      rar: 'Comprimido'
    };
    return types[ext] || 'Archivo';
  }

  /**
   * Formatea el tamaño del archivo en KB, MB, etc.
   */
  getFileSize(file?: File): string {
    if (!file || file.size === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(file.size) / Math.log(k));
    return `${(file.size / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  // ==================================================================
  // DEBUG (opcional - mantener solo en desarrollo)
  // ==================================================================

  /**
   * Método de depuración para inspeccionar estado interno.
   * Remover en producción.
   */
  debugDocument(): void {
    console.group(`DocumentItemComponent - ID: ${this.document?.id}`);
    console.log('Input document:', this.document);
    console.log('Cached document:', this.cachedDocument);
    console.log('Getters:', {
      documentName: this.documentName,
      documentFileName: this.documentFileName,
      isCompleted: this.isCompleted,
      isPending: this.isPending,
      hasGuide: this.hasGuide,
      guideFileName: this.guideFileName
    });
    console.groupEnd();
  }
}