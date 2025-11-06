

import { UserInfoResponse } from "./user.model";

/** -----------------------------------------------------
 * 📌 Tipos compartidos y enums
 * ----------------------------------------------------- */
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'all';
export type TimeRange = 'year' | 'week' | 'month';

export enum ActivityAction {
  UPLOAD = 'upload',
  VIEW = 'view',
  DELETE = 'delete',
  DOWNLOAD = 'download',
  SHARE = 'share',
}

/** -----------------------------------------------------
 * 📁 Documentos
 * ----------------------------------------------------- */

interface BaseDocument {
  filename: string;
  mimetype: string;
  size: number;
  file_type: DocumentType;
  text: string;
  blob_enc: string;
}

export interface Document extends BaseDocument {
  id: number;
  created_at: string; 
}

export interface DocumentCreate extends BaseDocument {
  uploaded_by: number;
}

export interface DocumentWithMetadata {
  id: number;
  filename: string;
  file_type: DocumentType;
  size: number;
  created_at: string;
  last_accessed?: string;
  user_id: number;
  user_name: string;
  download_count: number;
  view_count: number;
  tags?: string[];
  matchScore?: number;
  upload_date: string; 
  uploaded_by_name: string; 
}

export interface DocumentSearchParams {
  text?: string;
  file_type?: DocumentType;
}

export interface PaginatedResponse<T> {
  total_count: number;
  items: T[];
  total: number;
  skip: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
  search_params?: Record<string, unknown>;
}

export type PaginatedDocumentsResponse = PaginatedResponse<DocumentWithMetadata>;

export interface UserExtended extends UserInfoResponse {
  documentsCount: number;
  lastActivity: string;
  documents: DocumentWithMetadata[];
  status?: 'active' | 'inactive';
  profile_photo_url?: string | null;
}
/** -----------------------------------------------------
 * 📊 Dashboard y estadísticas
 * ----------------------------------------------------- */

export interface DashboardStats {
  totalDocuments: number;
  totalSize: number;
  documentsToday: number;
  documentsThisWeek: number;
  documentsThisMonth: number;
  averagePerDay: number;
  mostActiveUser?: string | null;
  peakUploadTime?: string | null;
  typeBreakdown: TypeBreakdown[];
}

export interface TypeBreakdown {
  file_type: DocumentType;
  count: number;
  size: number;
}

export interface ChartDataPoint {
  value: number;
  label: string;
  date: string;
  pdf: number;
  docx: number;
  txt: number;
  total: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  cpu_usage: number;
  memory_usage: number;
  storage_usage: number;
  active_users: number;
  response_time: number;
}
export interface UserActivity {
  user_id: number;
  user_name: string;
  total_actions: number;
  last_activity: string;
  most_common_action: ActivityAction;
}
/** -----------------------------------------------------
 * 👤 Usuarios
 * ----------------------------------------------------- */

export interface StorageStats {
  user_id: number;
  total_documents: number;
  total_size: number;
  type_breakdown: TypeBreakdown[];
}

export interface UserSummary {
  user_id: number;
  user_name: string;
  user_email: string;
  storage: StorageStats;
  dashboard: DashboardStats;
  recent_activities_count: number;
  last_activity: string | null;
  generated_at: string;
}

/** -----------------------------------------------------
 * 📝 Actividades
 * ----------------------------------------------------- */

export interface Activity {
  id: string;
  document: Document;
  type: ActivityAction;
  date: Date;
}

export interface ActivityLog {
  id: number;
  action: ActivityAction;
  document_id: number;
  document_name: string;
  document_type: string;
  user_id: number;
  user_name: string;
  timestamp: string;
  ip_address: string | null;
  user_email: string;
}

interface ActivityVisualConfig {
  icon: string;
  color: string;
  label: string;
  badge: string;
}

export const activityConfig: Record<ActivityAction | 'default', ActivityVisualConfig> = {
  [ActivityAction.UPLOAD]: {
    icon: 'fas fa-upload',
    color: 'text-success',
    label: 'Subida',
    badge: 'badge-success',
  },
  [ActivityAction.VIEW]: {
    icon: 'fas fa-eye',
    color: 'text-info',
    label: 'Vista',
    badge: 'badge-info',
  },
  [ActivityAction.DELETE]: {
    icon: 'fas fa-trash-alt',
    color: 'text-danger',
    label: 'Eliminada',
    badge: 'badge-danger',
  },
  [ActivityAction.DOWNLOAD]: {
    icon: 'fas fa-download',
    color: 'text-primary',
    label: 'Descargada',
    badge: 'badge-primary',
  },
  [ActivityAction.SHARE]: {
    icon: 'fas fa-share-alt',
    color: 'text-warning',
    label: 'Compartida',
    badge: 'badge-warning',
  },
  default: {
    icon: 'fas fa-question-circle',
    color: 'text-muted',
    label: 'Desconocida',
    badge: 'badge-secondary',
  },
};

/**
 * Devuelve la configuración visual de una acción.
 */
export function getActivityConfig(type: ActivityAction | string): ActivityVisualConfig {
  return activityConfig[type as ActivityAction] || activityConfig.default;
}
/*
interface ValidationError {
  detail: {
    loc: (string | number)[];
    msg: string;
    type: string;
  }[];
}
*/
export interface DocumentUploadResponse {
  successful_uploads: Document[];
  failed_uploads: Record<string, string>[];
  total_processed: number;
  success_count: number;
  failure_count: number;
}
