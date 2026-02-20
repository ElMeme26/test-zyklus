import { apiFetch } from './client';

export async function reportMaintenance(
  assetId: string,
  userId: string,
  description: string
): Promise<void> {
  await apiFetch('/api/maintenance', {
    method: 'POST',
    body: JSON.stringify({ assetId, userId, description }),
  });
}

export async function resolveMaintenance(logId: number, cost?: number): Promise<void> {
  await apiFetch(`/api/maintenance/${logId}/resolve`, {
    method: 'PUT',
    body: JSON.stringify({ cost }),
  });
}
