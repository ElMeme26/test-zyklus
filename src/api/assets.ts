/** Cliente API para activos: listado, CRUD, importación y validación de mantenimiento. */
import { apiFetch } from './client';
import type { Asset } from '../types';

export interface AssetsPaginatedResponse {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
  categories?: string[];
}

export async function getAssetsPaginated(
  page = 1,
  limit = 24,
  filters?: { search?: string; category?: string; status?: string; availableOnly?: boolean; maintenanceOnly?: boolean; unbundledOnly?: boolean; export?: boolean }
): Promise<AssetsPaginatedResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters?.export) params.set('export', 'true');
  if (filters?.search) params.set('search', filters.search);
  if (filters?.category && filters.category !== 'Todas') params.set('category', filters.category);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.availableOnly) params.set('availableOnly', 'true');
  if (filters?.maintenanceOnly) params.set('maintenanceOnly', 'true');
  if (filters?.unbundledOnly) params.set('unbundledOnly', 'true');
  return apiFetch<AssetsPaginatedResponse>(`/api/assets?${params}`);
}

export async function getAssetById(id: string): Promise<Asset | null> {
  try {
    return await apiFetch<Asset>(`/api/assets/${id}`);
  } catch {
    return null;
  }
}

export async function getNextTag(): Promise<string> {
  const res = await apiFetch<{ tag: string }>('/api/assets/next-tag');
  return res.tag;
}

export async function createAsset(asset: Partial<Asset>): Promise<Asset> {
  return apiFetch<Asset>('/api/assets', {
    method: 'POST',
    body: JSON.stringify(asset),
  });
}

export async function updateAsset(id: string, updates: Partial<Asset>): Promise<void> {
  await apiFetch(`/api/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteAsset(id: string): Promise<void> {
  await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
}

export async function importAssets(rows: Record<string, unknown>[]): Promise<number> {
  const res = await apiFetch<{ count: number }>('/api/assets/import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
  return res.count;
}

export async function validateMaintenance(
  assetId: string,
  maintenancePeriodDays?: number
): Promise<void> {
  await apiFetch(`/api/assets/${assetId}/validate-maintenance`, {
    method: 'POST',
    body: JSON.stringify({ maintenancePeriodDays: maintenancePeriodDays ?? 180 }),
  });
}
