// ============================================================
// ZYKLUS 2.0 — TYPE DEFINITIONS
// ============================================================

export type UserRole = 'AUDITOR' | 'ADMIN_PATRIMONIAL' | 'LIDER_EQUIPO' | 'USUARIO' | 'GUARDIA';

export type AssetState =
  | 'Disponible'
  | 'En mantenimiento'
  | 'Prestada'
  | 'Dada de baja'
  | 'Fuera de servicio'
  | 'En tránsito'
  | 'Requiere Calibración'
  | 'Requiere Mantenimiento'; // Bloqueo automático por mantenimiento preventivo

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

// ─── USER ────────────────────────────────────────────────────
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
  // Mantenimiento Preventivo
  maintenance_period_days?: number;     // Cada cuántos días → mantenimiento
  next_maintenance_date?: string;       // Próxima fecha calculada
  usage_count?: number;                 // Contador de préstamos para regla por uso
  maintenance_usage_threshold?: number; // Umbral de uso para trigger
  maintenance_alert?: boolean;          // Bandera visual de alerta
  bundle_id?: string;
  created_at: string;
}

// ─── INSTITUTION ─────────────────────────────────────────────
export interface Institution {
  id: number;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at?: string;
}

// ─── BUNDLE / KIT ────────────────────────────────────────────
export interface Bundle {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  created_at?: string;
  assets?: Asset[]; // Joined
}

// ─── REQUEST (PRÉSTAMO) ──────────────────────────────────────
export interface Request {
  id: number;
  asset_id: string;
  user_id: string;
  institution_id?: number;
  requester_name: string;
  requester_disciplina?: string;
  days_requested: number;
  motive?: string;
  status: RequestStatus;
  // QR — vinculado al request_id, no al activo
  qr_code?: string;          // URL/data del QR único
  qr_expires_at?: string;    // Caduca al hacer check-in

  // Trazabilidad
  created_at: string;
  approved_at?: string;
  checkout_at?: string;
  expected_return_date?: string;
  returned_at?: string;
  checkin_at?: string;

  // Feedback
  rejection_reason?: string;
  feedback_log?: string;
  return_condition?: string;

  // Guardia
  security_check_step?: number;
  security_notes?: string;
  digital_signature?: string; // Base64 o URL — evidencia legal
  is_damaged?: boolean;
  damage_notes?: string;

  // Relaciones (joins)
  assets?: Asset;
  users?: User;
  institutions?: Institution;
}

// ─── MAINTENANCE LOG ─────────────────────────────────────────
export interface MaintenanceLog {
  id: number;
  asset_id: string;
  reported_by_user_id?: string;
  issue_description?: string;
  cost?: number;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  created_at: string;
  resolved_at?: string;
  // Joins
  assets?: Asset;
  users?: User;
}

// ─── NOTIFICATION ────────────────────────────────────────────
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

// ─── AUDIT LOG ───────────────────────────────────────────────
export interface AuditLog {
  id: string;
  timestamp: string;
  action: AuditAction;
  actor_id: string;
  actor_name?: string;
  target_id: string;        // request_id o asset_id
  target_type: 'REQUEST' | 'ASSET' | 'USER' | 'INSTITUTION';
  details?: string;
  metadata?: Record<string, unknown>;
}

// ─── MAINTENANCE RULE ────────────────────────────────────────
export interface MaintenanceRule {
  asset_id: string;
  trigger_type: 'TIME' | 'USAGE' | 'BOTH';
  period_days?: number;    // Cada N días
  usage_threshold?: number; // Después de N préstamos
  auto_block: boolean;     // Bloquear solicitudes automáticamente
}

// ─── QR PAYLOAD ──────────────────────────────────────────────
// Estructura del contenido embebido en el QR de salida
export interface QRPayload {
  request_id: number;
  asset_id: string;
  asset_name: string;
  requester_name: string;
  approver_name?: string;
  checkout_date: string;
  expected_return: string;
  generated_at: string;
  is_valid: boolean; // false después de check-in
}

// ─── QR TYPES ────────────────────────────────────────────────
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
  id: string; // asset_id
  tag: string;
  name: string;
}