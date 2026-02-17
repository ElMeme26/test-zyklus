export type UserRole = 'AUDITOR' | 'ADMIN_PATRIMONIAL' | 'LIDER_EQUIPO' | 'USUARIO' | 'GUARDIA';

export type AssetState = 
  | 'Operativa' 
  | 'En mantenimiento' 
  | 'Prestada' 
  | 'Dada de baja' 
  | 'Fuera de servicio' 
  | 'En tránsito' 
  | 'Requiere Calibración'; // Nuevo estado para mantenimiento preventivo

export type RequestStatus = 
  | 'PENDING'         // Esperando al Líder
  | 'ACTION_REQUIRED' // Devuelta por el Líder (Feedback)
  | 'APPROVED'        // Aprobada por Líder (Listo para salir)
  | 'ACTIVE'          // En posesión del usuario (Check-out realizado)
  | 'OVERDUE'         // Vencida
  | 'RETURNED'        // Devuelta (Check-in realizado)
  | 'MAINTENANCE'     // Devuelta con daños
  | 'REJECTED'        // Rechazada
  | 'CANCELLED';      // Cancelada por usuario

export interface User {
  id: string; // UUID
  name: string;
  email: string;
  role: UserRole;
  dept: string;
  avatar?: string;
  manager_id?: string; // ID del Líder de Equipo
}

export interface Asset {
  id: string; 
  tag: string; // ZF-001
  name: string;
  description: string;
  category: string;
  brand: string;
  model: string;
  serial: string;
  status: AssetState;
  image: string;
  location: string;
  commercial_value: number;
  maintenance_alert?: boolean; // Bandera para mantenimiento preventivo
  usage_count?: number; // Contador para reglas de mantenimiento
  created_at: string;
}

export interface Institution {
  id: number;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
}

export interface Request {
  id: number; // ID numérico para QRs más cortos
  asset_id: string;
  user_id: string;
  institution_id?: number; // Opcional, si es préstamo externo
  requester_name: string;
  requester_dept: string;
  days_requested: number;
  motive: string;
  status: RequestStatus;
  
  // Trazabilidad de Tiempo
  created_at: string;
  approved_at?: string;
  checkout_at?: string; // Fecha real de salida (Guardia)
  checkin_at?: string;  // Fecha real de retorno (Guardia)
  expected_return_date?: string;

  // Feedback y Seguridad
  rejection_reason?: string; // Razón de devolución del líder
  is_damaged?: boolean;      // Marcado por el guardia
  damage_notes?: string;
  
  // Firma Digital
  digital_signature?: string; // URL o Base64

  // Relaciones
  assets?: Asset;
  users?: User;
  institutions?: Institution;
}

// Log de Auditoría
export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'APPROVE' | 'REJECT' | 'CHECKOUT' | 'CHECKIN' | 'UPDATE' | 'ALERT';
  actor_id: string; // Quién hizo la acción
  target_id: string; // ID del activo o solicitud
  details: string;
}