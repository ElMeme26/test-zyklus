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

export function getData(): Promise<ApiDataResponse> {
  return apiFetch<ApiDataResponse>('/api/data');
}

export interface DataStatsResponse {
  assetCounts: { total: number; disponible: number; prestada: number; mantenimiento: number; [key: string]: number };
  requestCounts: { overdue: number; active: number };
  categoryCounts?: Record<string, number>;
}

export function getStats(): Promise<DataStatsResponse> {
  return apiFetch<DataStatsResponse>('/api/data/stats');
}
