/** Cliente API para solicitudes: crear, aprobar, rechazar, renovar, cancelar. */
import { apiFetch } from './client';
import type { User } from '../types';

/** Crea una solicitud individual de préstamo. */
export async function createRequest(
  assetId: string,
  user: User,
  days: number,
  motive?: string,
  institutionId?: number,
  autoApprove?: boolean
): Promise<{ id: number }> {
  return apiFetch<{ id: number }>('/api/requests', {
    method: 'POST',
    body: JSON.stringify({
      assetId,
      userId: user.id,
      userName: user.name,
      userDisciplina: user.disciplina,
      managerId: user.manager_id,
      days,
      motive: motive ?? '',
      institutionId: institutionId ?? null,
      autoApprove: Boolean(autoApprove),
    }),
  });
}

/** Crea solicitudes en lote (carrito). */
export async function createBatchRequest(
  assetIds: string[],
  user: User,
  days: number,
  motive?: string,
  institutionId?: number,
  autoApprove?: boolean
): Promise<void> {
  await apiFetch('/api/requests/batch', {
    method: 'POST',
    body: JSON.stringify({
      assetIds,
      userId: user.id,
      userName: user.name,
      userDisciplina: user.disciplina,
      managerId: user.manager_id,
      days,
      motive: motive ?? '',
      institutionId: institutionId ?? null,
      autoApprove: Boolean(autoApprove),
    }),
  });
}

/** Crea solicitudes para un combo (kit). */
export async function createBundleRequest(
  bundleId: string,
  assetIds: string[],
  bundleName: string,
  user: User,
  days: number,
  motive: string,
  autoApprove?: boolean
): Promise<void> {
  await apiFetch('/api/requests/bundle', {
    method: 'POST',
    body: JSON.stringify({
      bundleId,
      assetIds,
      bundleName,
      userId: user.id,
      userName: user.name,
      userDisciplina: user.disciplina,
      managerId: user.manager_id,
      days,
      motive,
      autoApprove: Boolean(autoApprove),
    }),
  });
}

/** Aprueba una solicitud (individual o combo). */
export async function approveRequest(
  reqId: number,
  approverId: string,
  approverName: string,
  body?: { bundleGroupId?: string; userId?: string; assetName?: string }
): Promise<void> {
  await apiFetch(`/api/requests/${reqId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({
      approverId,
      approverName,
      bundleGroupId: body?.bundleGroupId,
      userId: body?.userId,
      assetName: body?.assetName,
    }),
  });
}

/** Rechaza una solicitud con motivo. */
export async function rejectRequest(
  reqId: number,
  reason: string,
  body?: { bundleGroupId?: string; assetIds?: string[]; userId?: string }
): Promise<void> {
  await apiFetch(`/api/requests/${reqId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason, ...body }),
  });
}

/** Devuelve la solicitud al usuario con feedback. */
export async function returnRequestWithFeedback(
  reqId: number,
  feedback: string,
  body?: { bundleGroupId?: string; userId?: string }
): Promise<void> {
  await apiFetch(`/api/requests/${reqId}/feedback`, {
    method: 'PUT',
    body: JSON.stringify({ feedback, ...body }),
  });
}

/** Cancela una solicitud. */
export async function cancelRequest(
  reqId: number,
  body?: { bundleGroupId?: string; assetIdsToFree?: string[] }
): Promise<void> {
  await apiFetch(`/api/requests/${reqId}/cancel`, {
    method: 'PUT',
    body: JSON.stringify(body ?? {}),
  });
}

/** Responde al feedback del líder. */
export async function respondToFeedback(
  reqId: number,
  feedback: string,
  bundleGroupId?: string
): Promise<void> {
  await apiFetch(`/api/requests/${reqId}/respond-feedback`, {
    method: 'PUT',
    body: JSON.stringify({ feedback: `Usuario respondió: ${feedback}`, bundleGroupId }),
  });
}

/** Extiende la fecha de retorno de un préstamo. */
export async function renewRequest(reqId: number, additionalDays: number): Promise<void> {
  await apiFetch(`/api/requests/${reqId}/renew`, {
    method: 'PUT',
    body: JSON.stringify({ additionalDays }),
  });
}
