import { query } from '../db/index.js';
import { createNotif, notifyByRole } from './notificationService.js';

function differenceInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}
function differenceInHours(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (60 * 60 * 1000));
}

export async function checkOverdue(): Promise<void> {
  const result = await query(
    `SELECT r.id, r.asset_id, r.user_id, r.expected_return_date, r.status, r.requester_name,
            u.manager_id,
            a.name as asset_name
     FROM requests r
     LEFT JOIN users u ON r.user_id = u.id
     LEFT JOIN assets a ON r.asset_id = a.id
     WHERE r.status = 'ACTIVE' AND r.expected_return_date IS NOT NULL`
  );
  const rows = (result.rows ?? []) as Array<{
    id: number;
    asset_id: string;
    user_id: string;
    expected_return_date: string;
    requester_name: string;
    manager_id?: string;
    asset_name?: string;
  }>;
  const now = new Date();

  for (const req of rows) {
    const ret = new Date(req.expected_return_date);
    const daysLate = differenceInDays(now, ret);
    const hoursLeft = differenceInHours(ret, now);

    if (hoursLeft <= 48 && hoursLeft > 24 && req.user_id) {
      const e = await query(
        `SELECT id FROM notifications WHERE user_id = $1 AND request_id = $2 AND title = $3 LIMIT 1`,
        [req.user_id, req.id, '📅 Recordatorio — 48h']
      );
      if (e.rows.length === 0) await createNotif(req.user_id, '📅 Recordatorio — 48h', 'Tu préstamo vence en 2 días.', 'WARNING', req.id);
    }
    if (hoursLeft <= 24 && hoursLeft > 0 && req.user_id) {
      const e = await query(
        `SELECT id FROM notifications WHERE user_id = $1 AND request_id = $2 AND title = $3 LIMIT 1`,
        [req.user_id, req.id, '⏰ Recordatorio — 24h']
      );
      if (e.rows.length === 0) await createNotif(req.user_id, '⏰ Recordatorio — 24h', 'Tu préstamo vence mañana.', 'WARNING', req.id);
    }
    if (daysLate >= 1) {
      await query(`UPDATE requests SET status = 'OVERDUE' WHERE id = $1 AND status = 'ACTIVE'`, [req.id]);
      if (daysLate === 1 && req.user_id) {
        await createNotif(req.user_id, '⚠️ Préstamo Vencido', `"${req.asset_name ?? 'Activo'}" venció. Devuélvelo hoy.`, 'ALERT', req.id);
        if (req.manager_id) await createNotif(req.manager_id, '⚠️ Equipo — Vencido', `${req.requester_name}: "${req.asset_name ?? 'Activo'}" vencido.`, 'WARNING', req.id);
        await notifyByRole('ADMIN_PATRIMONIAL', '⚠️ Préstamo Vencido', `${req.requester_name}: "${req.asset_name ?? 'Activo'}".`, 'WARNING', req.id);
        const auditors = await query('SELECT id FROM users WHERE role = $1', ['AUDITOR']);
        for (const aud of auditors.rows ?? []) {
          const aid = (aud as { id: string }).id;
          await createNotif(aid, '🚨 Préstamo Vencido', `${req.requester_name}: "${req.asset_name ?? 'Activo'}" venció.`, 'ALERT', req.id);
        }
      }
      if (daysLate >= 3 && req.user_id) {
        const e3 = await query(
          `SELECT id FROM notifications WHERE user_id = $1 AND request_id = $2 AND title = $3 LIMIT 1`,
          [req.user_id, req.id, '🚨 Incumplimiento — 3 días']
        );
        if (e3.rows.length === 0) {
          await createNotif(req.user_id, '🚨 Incumplimiento — 3 días', 'Acción inmediata requerida.', 'CRITICAL', req.id);
          if (req.manager_id) await createNotif(req.manager_id, '🚨 Incumplimiento en Equipo', `${req.requester_name}: 3 días de retraso.`, 'CRITICAL', req.id);
          await notifyByRole('ADMIN_PATRIMONIAL', '🚨 Incumplimiento 3d', `${req.requester_name}: "${req.asset_name ?? 'Activo'}".`, 'CRITICAL', req.id);
          const auditors = await query('SELECT id FROM users WHERE role = $1', ['AUDITOR']);
          for (const aud of auditors.rows ?? []) {
            const aid = (aud as { id: string }).id;
            await createNotif(aid, '🚨 Préstamo Vencido', `${req.requester_name}: "${req.asset_name ?? 'Activo'}" — 3 días.`, 'ALERT', req.id);
          }
        }
      }
    }
  }
}
