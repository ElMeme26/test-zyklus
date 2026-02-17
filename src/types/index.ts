export type UserRole = 'AUDITOR' | 'ADMIN_PATRIMONIAL' | 'LIDER_EQUIPO' | 'USUARIO' | 'GUARDIA';

export type AssetStatus = 'Operativa' | 'En mantenimiento' | 'Prestada' | 'Dada de baja' | 'Fuera de servicio';

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

export interface User {
  id: string; // UUID
  name: string;
  email: string;
  role: UserRole;
  dept?: string;
  avatar?: string;
  phone?: string;
  manager_id?: string;
}

export interface Asset {
  id: string; // UUID
  tag?: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  model?: string;
  serial?: string;
  status: string; // Usamos string genérico o AssetStatus
  image?: string;
  location?: string;
  bundle_id?: string; // Nuevo campo
}

export interface Bundle {
  id: string; // UUID
  name: string;
  description?: string;
  image_url?: string;
  created_at?: string;
}

export interface Request {
  id: number; // BigInt (identity)
  asset_id: string;
  user_id: string;
  institution_id?: number;
  requester_name: string;
  requester_dept: string;
  days_requested: number;
  motive: string;
  status: RequestStatus;
  
  // Fechas
  created_at: string;
  approved_at?: string;
  checkout_at?: string;
  expected_return_date?: string;
  returned_at?: string;

  // Seguridad y Feedback
  security_check_step: number; // 0, 1, 2
  security_notes?: string;
  rejection_feedback?: string;

  // Relaciones (Joins)
  assets?: Asset;
  users?: User;
  institutions?: Institution;
}

export interface Institution {
  id: number;
  name: string;
  contact_name?: string;
  contact_email?: string;
  address?: string;
}