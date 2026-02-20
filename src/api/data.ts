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
