export type AssetState = 
  | 'Operativa' | 'En mantenimiento' | 'Fuera de servicio' | 'Calibración' 
  | 'Prestada' | 'Dada de baja' | 'En tránsito' | 'En aduana' 
  | 'En evaluación' | 'canibaizada' | 'impairment';

// Coincide con las columnas de tu tabla 'assets'
export interface Asset {
  id: string;
  tag: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  model: string;
  serial: string;
  project: string;
  commercial_value: number; // snake_case como en la BD
  invoice: string;
  import_type: string;
  status: AssetState;
  image: string;
  location: string;
}

// Coincide con tu tabla 'users'
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'AUDITOR' | 'ADMIN_PATRIMONIAL' | 'LIDER_EQUIPO' | 'USUARIO';
  dept: string;
  avatar: string;
}

// Coincide con tu tabla 'requests'
export interface Request {
  id: number;
  asset_id: string;
  user_email: string;
  user_name: string;
  user_dept: string;
  days: number;
  motive: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'RETURNED_WITH_OBSERVATIONS';
  created_at: string;
  assets?: Asset; // Para cuando hagamos el join
}