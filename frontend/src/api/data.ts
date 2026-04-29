import { apiFetch } from './client';
import type {
  Asset,
  Request,
  Institution,
  Notification,
  MaintenanceLog,
  AuditLog,
  Bundle,
} from '../types';

export interface ApiDataResponse {
  assets: Asset[];
  requests: Request[];
  institutions: Institution[];
  notifications: Notification[];
  maintenanceLogs: MaintenanceLog[];
  auditLogs: AuditLog[];
  bundles: Bundle[];
}

/** Obtiene todos los datos del sistema (activos, solicitudes, instituciones, etc.). */
export function getData(): Promise<ApiDataResponse> {
  return apiFetch<ApiDataResponse>('/api/data');
}

export interface DataStatsResponse {
  assetCounts: { total: number; disponible: number; prestada: number; mantenimiento: number; [key: string]: number };
  requestCounts: { overdue: number; active: number };
  categoryCounts?: Record<string, number>;
  topAssets?: Array<{ name: string; count: number }>;
  topUsers?: Array<{ name: string; count: number }>;
  disciplines?: string[];
  topAssetsByDiscipline?: Record<string, Array<{ name: string; count: number }>>;
}

/** Obtiene estadísticas (conteos de activos, solicitudes, categorías). */
export function getStats(): Promise<DataStatsResponse> {
  return apiFetch<DataStatsResponse>('/api/data/stats');
}

export interface AuditLogsPaginatedResponse {
  auditLogs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

/** Obtiene audit_logs paginados con filtrado. */
export function getAuditLogsPaginated(
  page = 1,
  limit = 50,
  filters?: { action?: string; search?: string }
): Promise<AuditLogsPaginatedResponse> {
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', String(limit));
  if (filters?.action) query.set('action', filters.action);
  if (filters?.search) query.set('search', filters.search);
  return apiFetch<AuditLogsPaginatedResponse>(`/api/data/audit-logs?${query}`);
}

export interface MaintenanceLogsPaginatedResponse {
  maintenanceLogs: MaintenanceLog[];
  total: number;
  page: number;
  limit: number;
}

/** Obtiene maintenance_logs paginados con filtrado. */
export function getMaintenanceLogsPaginated(
  page = 1,
  limit = 50,
  filters?: { status?: string; search?: string }
): Promise<MaintenanceLogsPaginatedResponse> {
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', String(limit));
  if (filters?.status) query.set('status', filters.status);
  if (filters?.search) query.set('search', filters.search);
  return apiFetch<MaintenanceLogsPaginatedResponse>(`/api/data/maintenance-logs?${query}`);
}
