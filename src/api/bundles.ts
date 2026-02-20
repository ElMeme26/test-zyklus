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
