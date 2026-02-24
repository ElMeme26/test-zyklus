/** Cliente API para notificaciones: marcar leídas y revisar vencimientos. */
import { apiFetch } from './client';

/** Marca una notificación como leída. */
export async function markRead(notifId: string): Promise<void> {
  await apiFetch(`/api/notifications/${notifId}/read`, {
    method: 'PUT',
    body: JSON.stringify({}),
  });
}

/** Marca todas las notificaciones del usuario como leídas. */
export async function markAllRead(userId: string): Promise<void> {
  await apiFetch('/api/notifications/read-all', {
    method: 'PUT',
    body: JSON.stringify({ userId }),
  });
}

/** Dispara la revisión de préstamos vencidos en el backend. */
export async function checkOverdue(): Promise<void> {
  await apiFetch('/api/notifications/check-overdue', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
