import { query } from '../db/index.js';

const isValidUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s ?? '');

/** Crea una notificación para un usuario. */
export async function createNotif(
  userId: string,
  title: string,
  message: string,
  type = 'INFO',
  requestId?: number,
  assetId?: string
): Promise<void> {
  if (!userId || !isValidUUID(userId)) return;
  await query(
    `INSERT INTO notifications (user_id, request_id, asset_id, title, message, type, is_read)
     VALUES ($1, $2, $3, $4, $5, $6, false)`,
    [userId, requestId ?? null, assetId ?? null, title, message, type]
  );
}

/** Crea notificaciones para todos los usuarios con un rol dado. */
export async function notifyByRole(
  role: string,
  title: string,
  message: string,
  type = 'INFO',
  requestId?: number,
  assetId?: string
): Promise<void> {
  const result = await query<{ id: string }>('SELECT id FROM users WHERE role = $1', [role]);
  const users = result.rows ?? [];
  for (const u of users) {
    await createNotif(u.id, title, message, type, requestId, assetId);
  }
}
