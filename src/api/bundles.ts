import { apiFetch } from './client';

export async function createBundle(
  name: string,
  description: string,
  assetIds: string[]
): Promise<void> {
  await apiFetch('/api/bundles', {
    method: 'POST',
    body: JSON.stringify({ name, description, assetIds }),
  });
}

export async function updateBundle(
  id: string,
  patch: { name?: string; description?: string; assetIds?: string[] }
): Promise<void> {
  await apiFetch(`/api/bundles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
