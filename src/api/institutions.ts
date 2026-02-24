/** Cliente API para instituciones externas: CRUD. */
import { apiFetch } from './client';
import type { Institution } from '../types';

/** Registra una nueva institución. */
export async function addInstitution(inst: Partial<Institution>): Promise<void> {
  await apiFetch('/api/institutions', {
    method: 'POST',
    body: JSON.stringify(inst),
  });
}

/** Actualiza una institución existente. */
export async function updateInstitution(id: number, updates: Partial<Institution>): Promise<void> {
  await apiFetch(`/api/institutions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/** Elimina una institución. */
export async function deleteInstitution(id: number): Promise<void> {
  await apiFetch(`/api/institutions/${id}`, { method: 'DELETE' });
}
