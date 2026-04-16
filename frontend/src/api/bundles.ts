/** Cliente API para combos (bundles): crear y actualizar. */
import { apiFetch } from './client';

/** Crea un combo con nombre, descripción y lista de IDs de activos. */
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

/** Actualiza un combo (nombre, descripción o activos). */
export async function updateBundle(
  id: string,
  patch: { name?: string; description?: string; assetIds?: string[] }
): Promise<void> {
  await apiFetch(`/api/bundles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
