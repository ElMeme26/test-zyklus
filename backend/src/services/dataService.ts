import { query } from '../db/index.js';

export interface DataPayload {
  assets: unknown[];
  requests: unknown[];
  institutions: unknown[];
  notifications: unknown[];
  maintenanceLogs: unknown[];
  auditLogs: unknown[];
  bundles: unknown[];
}

export async function getAllData(): Promise<DataPayload> {
  const [
    assetsRes,
    requestsRes,
    institutionsRes,
    notificationsRes,
    maintenanceRes,
    auditRes,
    bundlesRes,
    usersRes,
  ] = await Promise.all([
    query('SELECT * FROM assets ORDER BY created_at DESC'),
    query('SELECT * FROM requests ORDER BY created_at DESC'),
    query('SELECT * FROM institutions ORDER BY id DESC'),
    query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100'),
    query(
      `SELECT ml.*, row_to_json(a) AS assets, row_to_json(u) AS users
       FROM maintenance_logs ml
       LEFT JOIN assets a ON ml.asset_id = a.id
       LEFT JOIN users u ON ml.reported_by_user_id = u.id
       ORDER BY ml.created_at DESC`
    ),
    query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200'),
    query('SELECT * FROM bundles ORDER BY created_at DESC'),
    query('SELECT id, name, email, role, disciplina, avatar, phone, manager_id, created_at FROM users'),
  ]);

  const assets = (assetsRes.rows ?? []) as Record<string, unknown>[];
  const requests = (requestsRes.rows ?? []) as Record<string, unknown>[];
  const institutions = institutionsRes.rows ?? [];
  const notifications = notificationsRes.rows ?? [];
  const maintenanceLogs = (maintenanceRes.rows ?? []).map((row: Record<string, unknown>) => {
    const { assets: assetRow, users: userRow, ...rest } = row;
    return { ...rest, assets: assetRow, users: userRow };
  });
  const auditLogs = auditRes.rows ?? [];
  const bundles = bundlesRes.rows ?? [];
  const users = (usersRes.rows ?? []) as Record<string, unknown>[];

  const assetById = new Map(assets.map((a) => [a.id, a]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const institutionById = new Map((institutions as Record<string, unknown>[]).map((i) => [i.id, i]));

  const requestsWithJoins = requests.map((r) => ({
    ...r,
    assets: assetById.get(r.asset_id as string) ?? null,
    users: userById.get(r.user_id as string) ?? null,
    institutions: r.institution_id
      ? institutionById.get(r.institution_id as number) ?? null
      : null,
  }));

  const bundlesWithAssets = (bundles as Record<string, unknown>[]).map((b) => ({
    ...b,
    assets: assets.filter((a) => a.bundle_id === b.id),
  }));

  return {
    assets,
    requests: requestsWithJoins,
    institutions,
    notifications,
    maintenanceLogs,
    auditLogs,
    bundles: bundlesWithAssets,
  };
}
