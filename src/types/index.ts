/** Tipos e interfaces compartidos del frontend (activos, usuarios, solicitudes, etc.). */

export type UserRole = 'AUDITOR' | 'ADMIN_PATRIMONIAL' | 'LIDER_EQUIPO' | 'USUARIO' | 'GUARDIA';

export type AssetState =
  | 'Disponible'
  | 'En mantenimiento'
  | 'Prestada'
  | 'Dada de baja'
  | 'Fuera de servicio'
  | 'En tránsito'
  | 'Requiere Calibración'
  | 'Requiere Mantenimiento'
  | 'En trámite';  // Solicitud en proceso — bloqueado para nuevas solicitudes

export type RequestStatus =
  | 'PENDING'
  | 'ACTION_REQUIRED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'OVERDUE'
  | 'RETURNED'
  | 'MAINTENANCE'
  | 'REJECTED'
  | 'CANCELLED';

export type NotificationChannel = 'IN_APP' | 'CHAT' | 'EMAIL';
export type NotificationType = 'WARNING' | 'ALERT' | 'INFO' | 'CRITICAL';
export type AuditAction = 'CREATE' | 'APPROVE' | 'REJECT' | 'CHECKOUT' | 'CHECKIN' | 'UPDATE' | 'ALERT' | 'MAINTENANCE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  disciplina: string;
  avatar?: string;
  phone?: string;
  manager_id?: string;
  created_at?: string;
}

// ─── ASSET ───────────────────────────────────────────────────
export interface Asset {
  id: string;
  tag: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  model?: string;
  serial?: string;
  part_number?: string;
  project?: string;
  commercial_value?: number;
  invoice?: string;
  import_type?: string;
  status: AssetState;
  image?: string;
  location?: string;
  maintenance_period_days?: number;
  next_maintenance_date?: string;
  usage_count?: number;
  maintenance_usage_threshold?: number;
  maintenance_alert?: boolean;
  bundle_id?: string;
  created_at: string;
}

export interface Institution {
  id: number;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at?: string;
}

export interface Bundle {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  created_at?: string;
  assets?: Asset[];
}

export interface Request {
  id: number;
  asset_id: string;
  user_id: string;
  institution_id?: number;
  requester_name: string;
  // BD usa requester_disciplina; requester_dept es alias para compatibilidad de exportación
  requester_disciplina?: string;
  /** @deprecated usar requester_disciplina — se mantiene para compatibilidad de export */
  requester_dept?: string;
  days_requested: number;
  motive?: string;
  status: RequestStatus;

  // Propiedades para Combos (Bundles) — calculadas en cliente, no en BD
  bundle_group_id?: string;
  is_bundle?: boolean;
  bundle_items?: number;

  qr_code?: string;
  qr_expires_at?: string;

  created_at: string;
  approved_at?: string;
  checkout_at?: string;
  expected_return_date?: string;
  returned_at?: string;
  checkin_at?: string;

  // Nombres exactos de la BD
  rejection_feedback?: string;
  feedback_log?: string;
  return_condition?: string;

  security_check_step?: number;
  security_notes?: string;
  digital_signature?: string;
  is_damaged?: boolean;
  damage_notes?: string;

  // Joined relations (via Supabase select con alias)
  assets?: Asset;
  users?: User;
  institutions?: Institution;
}

export interface MaintenanceLog {
  id: number;
  asset_id: string;
  reported_by_user_id?: string;
  issue_description?: string;
  cost?: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  created_at: string;
  resolved_at?: string;
  assets?: Asset;
  users?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  request_id?: number;
  asset_id?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: AuditAction;
  // actor_id es uuid nullable en BD
  actor_id: string | null;
  actor_name?: string;
  target_id: string;
  target_type: 'REQUEST' | 'ASSET' | 'USER' | 'INSTITUTION';
  details?: string;
  metadata?: Record<string, unknown>;
}

export interface MaintenanceRule {
  asset_id: string;
  trigger_type: 'TIME' | 'USAGE' | 'BOTH';
  period_days?: number;
  usage_threshold?: number;
  auto_block: boolean;
}

export interface QRPayload {
  request_id: number;
  asset_id: string;
  asset_name: string;
  requester_name: string;
  approver_name?: string;
  checkout_date: string;
  expected_return: string;
  generated_at: string;
  is_valid: boolean;
}

export type QRType = 'REQUEST' | 'ASSET_PHYSICAL';

export interface QRRequestPayload {
  type: 'REQUEST';
  request_id: number;
  asset_id: string;
  requester_name: string;
  generated_at: string;
}

export interface QRAssetPayload {
  type: 'ASSET_PHYSICAL';
  id: string;
  tag: string;
  name: string;
}