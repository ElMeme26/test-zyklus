import { apiFetch } from './client';

export async function markRead(notifId: string): Promise<void> {
  await apiFetch(`/api/notifications/${notifId}/read`, {
    method: 'PUT',
    body: JSON.stringify({}),
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await apiFetch('/api/notifications/read-all', {
    method: 'PUT',
    body: JSON.stringify({ userId }),
  });
}

export async function checkOverdue(): Promise<void> {
  await apiFetch('/api/notifications/check-overdue', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
