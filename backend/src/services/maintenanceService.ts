import { query } from '../db/index.js';
import { logAudit } from './auditService.js';
import { notifyByRole } from './notificationService.js';

const isValidUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s ?? '');

const toDateString = (d: Date) => d.toISOString().split('T')[0];

/** Registra una incidencia de mantenimiento y notifica al admin. */
export async function reportMaintenance(
  assetId: string,
  userId: string,
  description: string
): Promise<void> {
  await query(
    `INSERT INTO maintenance_logs (asset_id, reported_by_user_id, issue_description, status)
     VALUES ($1, $2, $3, 'OPEN')`,
    [assetId, isValidUUID(userId) ? userId : null, description]
  );
  await query(
    `UPDATE assets SET status = 'En mantenimiento', maintenance_alert = true WHERE id = $1`,
    [assetId]
  );
  await logAudit('MAINTENANCE', userId, 'Sistema', assetId, 'ASSET', description);
  await notifyByRole('ADMIN_PATRIMONIAL', 'Mantenimiento', description, 'WARNING', undefined, assetId);
}

/** Marca una incidencia como resuelta y libera el activo. */
export async function resolveMaintenance(logId: number, cost?: number): Promise<void> {
  const result = await query(
    `UPDATE maintenance_logs SET status = 'RESOLVED', resolved_at = $1, cost = $2 WHERE id = $3 RETURNING asset_id`,
    [new Date().toISOString(), cost ?? null, logId]
  );
  const row = result.rows[0] as { asset_id: string } | undefined;
  if (row?.asset_id) {
    const nextDate = toDateString(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000));
    await query(
      `UPDATE assets SET status = 'Disponible', maintenance_alert = false, usage_count = 0, next_maintenance_date = $1 WHERE id = $2`,
      [nextDate, row.asset_id]
    );
    await logAudit('UPDATE', 'admin', 'Admin', row.asset_id, 'ASSET', 'Mantenimiento resuelto');
  }
}
