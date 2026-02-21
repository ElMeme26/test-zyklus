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
    requestsRes,
    institutionsRes,
    notificationsRes,
    maintenanceRes,
    auditRes,
    bundlesRes,
    bundleAssetsRes,
  ] = await Promise.all([
    query(
      `SELECT r.*,
        row_to_json(a) AS assets,
        row_to_json(u) AS users,
        row_to_json(i) AS institutions
       FROM requests r
       LEFT JOIN assets a ON r.asset_id = a.id
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN institutions i ON r.institution_id = i.id
       ORDER BY r.created_at DESC`
    ),
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
    query('SELECT * FROM assets WHERE bundle_id IS NOT NULL ORDER BY created_at DESC'),
  ]);

  const requests = (requestsRes.rows ?? []).map((row: Record<string, unknown>) => {
    const { assets: assetRow, users: userRow, institutions: instRow, ...rest } = row;
    return { ...rest, assets: assetRow ?? null, users: userRow ?? null, institutions: instRow ?? null };
  });
  const institutions = institutionsRes.rows ?? [];
  const notifications = notificationsRes.rows ?? [];
  const maintenanceLogs = (maintenanceRes.rows ?? []).map((row: Record<string, unknown>) => {
    const { assets: assetRow, users: userRow, ...rest } = row;
    return { ...rest, assets: assetRow, users: userRow };
  });
  const auditLogs = auditRes.rows ?? [];
  const bundles = bundlesRes.rows ?? [];
  const bundleAssets = (bundleAssetsRes.rows ?? []) as Record<string, unknown>[];

  const assetsByBundleId = new Map<string | number, Record<string, unknown>[]>();
  for (const a of bundleAssets) {
    const bid = a.bundle_id as string | number;
    if (!assetsByBundleId.has(bid)) assetsByBundleId.set(bid, []);
    assetsByBundleId.get(bid)!.push(a);
  }

  const bundlesWithAssets = (bundles as Record<string, unknown>[]).map((b) => ({
    ...b,
    assets: assetsByBundleId.get(b.id as string | number) ?? [],
  }));

  return {
    assets: [],
    requests,
    institutions,
    notifications,
    maintenanceLogs,
    auditLogs,
    bundles: bundlesWithAssets,
  };
}

export interface DataStats {
  assetCounts: { total: number; disponible: number; prestada: number; mantenimiento: number; [key: string]: number };
  requestCounts: { overdue: number; active: number };
  categoryCounts?: Record<string, number>;
}

export async function getStats(): Promise<DataStats> {
  const [assetCountsRes, overdueRes, activeRes, categoryRes] = await Promise.all([
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::int AS count FROM assets GROUP BY status`
    ),
    query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM requests WHERE status = 'OVERDUE'`),
    query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM requests WHERE status = 'ACTIVE'`),
    query<{ category: string; count: string }>(`SELECT category, COUNT(*)::int AS count FROM assets WHERE category IS NOT NULL AND category != '' GROUP BY category`),
  ]);

  const assetCounts: { total: number; disponible: number; prestada: number; mantenimiento: number; [key: string]: number } = { total: 0, disponible: 0, prestada: 0, mantenimiento: 0 };
  for (const row of assetCountsRes.rows ?? []) {
    const status = row.status ?? '';
    const count = Number(row.count ?? 0);
    assetCounts.total += count;
    if (status === 'Disponible') assetCounts.disponible = count;
    else if (status === 'Prestada') assetCounts.prestada = count;
    else if (status === 'En mantenimiento' || status === 'Requiere Mantenimiento') {
      assetCounts.mantenimiento = (assetCounts.mantenimiento ?? 0) + count;
    }
  }

  const categoryCounts: Record<string, number> = {};
  for (const row of categoryRes.rows ?? []) {
    categoryCounts[row.category ?? ''] = Number(row.count ?? 0);
  }

  return {
    assetCounts,
    requestCounts: {
      overdue: Number(overdueRes.rows[0]?.count ?? 0),
      active: Number(activeRes.rows[0]?.count ?? 0),
    },
    categoryCounts,
  };
}
