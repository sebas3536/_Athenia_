/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/domain/models/convocatorias.model.ts

// ============================================
// TIPOS DE DATOS
// ============================================

export type DeadlineStatus = 'safe' | 'warning' | 'critical' | 'overdue';
export type DocumentStatus = 'pending' | 'completed';
export type CollaboratorRole = 'admin' | 'editor' ;
export type HistoryAction = 'created' | 'uploaded' | 'deleted' | 'updated' | 'edited';

// ============================================
// INTERFACES
// ============================================

/**
 * Usuario disponible para agregar como colaborador
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

/**
 * Documento dentro de una convocatoria documentName
 */
export interface ConvocatoriaDocument {
  id: string;
  name: string;
  status?: DocumentStatus;
  file?: File;
  fileName?: string;
  uploadedAt?: Date;
  uploadedBy?: string;
  document_id?: number;
  // Guía opcional
  guide?: {
   id?: number;
    fileName: string;
    uploadedAt?: Date;
    uploadedBy?: string;
  };
}

/**
 * Colaborador de una convocatoria
 */
export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: CollaboratorRole;
  avatar: string;
  addedAt: Date;
}

/**
 * Entrada en el historial de cambios
 */
export interface ConvocatoriaHistoryEntry {
  id: string;
  documentName: string;
  action: HistoryAction;
  date: Date;
  user: string;
  projectName: string;
}

/**
 * Progreso de documentos
 */
export interface ConvocatoriaProgress {
  completed: number;
  total: number;
  percentage: number;
}

/**
 * Convocatoria principal
 */
export interface Convocatoria {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  startDate?: Date;
  endDate?: Date;
  documents: ConvocatoriaDocument[];
  history: ConvocatoriaHistoryEntry[];
  collaborators: Collaborator[];
  status?: 'active' | 'closed' | 'archived';
  owner?: string;
}

// ============================================
// REQUESTS
// ============================================

/**
 * Datos para crear una convocatoria
 */
export interface CreateConvocatoriaData {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Datos para crear una convocatoria (request al backend)
 */
export interface ConvocatoriaCreateRequest {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Datos para agregar un documento
 */
export interface AddDocumentData {
  name: string;
  hasDocument: boolean;
  file?: File;
  guide?: File;
}

/**
 * Datos para agregar colaboradores
 */
export interface AddCollaboratorData {
  userIds: number[];
  role: CollaboratorRole;
}

/**
 * Datos para actualizar colaborador
 */
export interface UpdateCollaboratorData {
  role: CollaboratorRole;
}

// ============================================
// RESPONSES
// ============================================

/**
 * Respuesta de creación de convocatoria
 */
export interface ConvocatoriaResponse {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  start_date?: string;
  end_date?: string;
  documents: any[];
  history: any[];
  collaborators: any[];
}

/**
 * Respuesta de subida de documento
 */
export interface DocumentUploadResponse {
  success: boolean;
  document_id: number;
  file_name: string;
  file_size: number;
  created_at: string;
  message?: string;
  success_count?: number;
  successful_uploads?: {
    id: number;
    name: string;
  }[];
}

/**
 * Respuesta de agregar colaboradores
 */
export interface AddCollaboratorsResponse {
  success: boolean;
  message: string;
  collaborators_added: number;
}

// ============================================
// VALIDACIÓN Y CONSTANTES
// ============================================

/**
 * Tipos de archivo permitidos para documentos
 */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
  'application/zip',
  'application/x-rar-compressed'
];

/**
 * Tamaño máximo de archivo en MB
 */
export const MAX_FILE_SIZE_MB = 50;

/**
 * Descripciones de roles
 */
export const ROLE_DESCRIPTIONS: Record<CollaboratorRole, string> = {
  'editor': 'Puede subir, editar y eliminar documentos',
  'admin': 'Control total incluyendo gestión de colaboradores'
};

/**
 * Colores para estados de deadline
 */
export const DEADLINE_COLORS: Record<DeadlineStatus, string> = {
  'safe': 'bg-green-100 border-green-300 text-green-800',
  'warning': 'bg-yellow-100 border-yellow-300 text-yellow-800',
  'critical': 'bg-orange-100 border-orange-300 text-orange-800',
  'overdue': 'bg-red-100 border-red-300 text-red-800'
};

/**
 * Iconos para estados de deadline (lucide-angular)
 */
export const DEADLINE_ICONS: Record<DeadlineStatus, string> = {
  'safe': 'Calendar',
  'warning': 'AlertCircle',
  'critical': 'Clock',
  'overdue': 'XCircle'
};