import { apiFetch } from './client';
import type { Institution } from '../types';

export async function addInstitution(inst: Partial<Institution>): Promise<void> {
  await apiFetch('/api/institutions', {
    method: 'POST',
    body: JSON.stringify(inst),
  });
}

export async function updateInstitution(id: number, updates: Partial<Institution>): Promise<void> {
  await apiFetch(`/api/institutions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteInstitution(id: number): Promise<void> {
  await apiFetch(`/api/institutions/${id}`, { method: 'DELETE' });
}
