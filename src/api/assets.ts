import { apiFetch } from './client';
import type { Asset } from '../types';

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
