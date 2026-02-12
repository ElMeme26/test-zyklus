export type AssetState = 
  | 'Operativa' | 'En mantenimiento' | 'Fuera de servicio' | 'Calibración' 
  | 'Prestada' | 'Dada de baja' | 'En tránsito';

export type RequestStatus = 
  | 'PENDING' | 'ACTION_REQUIRED' | 'APPROVED' | 'ACTIVE' 
  | 'OVERDUE' | 'RETURNED' | 'MAINTENANCE' | 'REJECTED' | 'CANCELLED';

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
  maintenance_period_days: number;
  next_maintenance_date: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'AUDITOR' | 'ADMIN_PATRIMONIAL' | 'LIDER_EQUIPO' | 'USUARIO';
  dept: string;
  avatar: string;
  phone: string;
  manager_id?: string;
}

export interface Request {
  id: number;
  asset_id: string;
  user_id?: string;
  institution_id?: number;
  requester_name: string;
  requester_dept: string;
  days_requested: number;
  motive: string;
  status: RequestStatus;
  created_at: string;
  approved_at?: string;
  checkout_at?: string;
  expected_return_date?: string;
  returned_at?: string;
  return_condition?: string;
  feedback_log?: string;
  assets?: Asset;
  users?: User;
}