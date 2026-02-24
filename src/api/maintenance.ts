/** Cliente API para mantenimiento: reportar incidencias y resolver. */
import { apiFetch } from './client';

/** Reporta una incidencia de mantenimiento en un activo. */
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

/** Marca una incidencia como resuelta (opcional: costo). */
export async function resolveMaintenance(logId: number, cost?: number): Promise<void> {
  await apiFetch(`/api/maintenance/${logId}/resolve`, {
    method: 'PUT',
    body: JSON.stringify({ cost }),
  });
}
