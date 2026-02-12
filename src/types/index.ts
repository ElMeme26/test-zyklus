export type AssetState = 
  | 'Operativa' | 'En mantenimiento' | 'Fuera de servicio' | 'Calibración' 
  | 'Prestada' | 'Dada de baja' | 'En tránsito';

export type RequestStatus = 
  | 'PENDING' | 'ACTION_REQUIRED' | 'APPROVED' | 'ACTIVE' 
  | 'OVERDUE' | 'RETURNED' | 'MAINTENANCE' | 'REJECTED' | 'CANCELLED';

// Activos (Inventario Interno)
export interface Asset {
  id: string;
  tag: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  model: string;
  serial: string;
  part_number: string;
  project: string;
  commercial_value: number;
  invoice: string;
  import_type: string;
  status: AssetState;
  image: string;
  location: string;
  created_at: string;
}

// Usuarios
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'AUDITOR' | 'ADMIN_PATRIMONIAL' | 'LIDER_EQUIPO' | 'USUARIO';
  dept: string;
  avatar: string;
}

// Solicitudes Internas
export interface Request {
  id: number;
  asset_id: string;
  user_id: string;
  requester_name: string;
  requester_dept: string;
  days_requested: number;
  motive: string;
  status: RequestStatus;
  created_at: string;
  assets?: Asset;
  users?: User;
}

// --- MÓDULO EXTERNO ---

// Instituciones (Clientes Externos)
export interface Institution {
  id: number;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
}

// Préstamos Externos
export interface ExternalLoan {
  id: string;
  institution_id: number;
  status: 'PENDING' | 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  loan_duration_days: number;
  created_at: string;
  checkout_at?: string;
  checkin_at?: string;
  qr_code?: string;
  institutions?: Institution;
  items?: { asset_id: string, assets: Asset }[];
}