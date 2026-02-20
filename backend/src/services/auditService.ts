import { query } from '../db/index.js';

const isValidUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s ?? '');

export type AuditAction =
  | 'CREATE'
  | 'APPROVE'
  | 'REJECT'
  | 'CHECKOUT'
  | 'CHECKIN'
  | 'UPDATE'
  | 'ALERT'
  | 'MAINTENANCE';

export async function logAudit(
  action: AuditAction,
  actorId: string,
  actorName: string,
  targetId: string,
  targetType: string,
  details?: string
): Promise<void> {
  await query(
    `INSERT INTO audit_logs (action, actor_id, actor_name, target_id, target_type, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      action,
      isValidUUID(actorId) ? actorId : null,
      actorName,
      targetId,
      targetType,
      details ?? null,
    ]
  );
}
