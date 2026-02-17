export type UserRole = 'AUDITOR' | 'ADMIN_PATRIMONIAL' | 'LIDER_EQUIPO' | 'USUARIO' | 'GUARDIA';

export type AssetStatus = 'Operativa' | 'En mantenimiento' | 'Prestada' | 'Dada de baja' | 'Fuera de servicio';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dept?: string;
  avatar?: string;
  manager_id?: string;
}

export interface Asset {
  id: string;
  tag?: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  model?: string;
  serial?: string;
  status: string; // O AssetStatus
  image?: string;
  location?: string;
  bundle_id?: string;
}

export interface Institution {
  id: number;
  name: string;
  contact_name?: string;
  contact_email?: string;
  address?: string;
  contact_phone?: string;
}

// Context Type Definition
export interface DataContextType {
  assets: Asset[];
  loading: boolean;
  addAsset: (asset: Asset) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  importAssets: (csvContent: string) => Promise<void>;
  getNextTag: () => string;
  processQRScan: (qrData: string) => Promise<void>;
  createBatchRequest: (assets: Asset[], user: User, days: number, motive: string) => Promise<void>;
}