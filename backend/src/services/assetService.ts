import { query } from '../db/index.js';
import { logAudit } from './auditService.js';
import { notifyByRole } from './notificationService.js';

const toDateString = (d: Date) => d.toISOString().split('T')[0];

/** Resultado de la búsqueda paginada de activos. */
export interface AssetsPaginatedResult {
  assets: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  categories?: string[];
}

/** Lista activos con filtros, paginación y categorías distintas para el catálogo. */
export async function getAssetsPaginated(
  page = 1,
  limit = 24,
  filters?: { search?: string; category?: string; status?: string; availableOnly?: boolean; maintenanceOnly?: boolean; unbundledOnly?: boolean }
): Promise<AssetsPaginatedResult> {
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.search) {
    conditions.push(`(LOWER(name) LIKE LOWER($${paramIndex}) OR LOWER(tag) LIKE LOWER($${paramIndex}) OR LOWER(category) LIKE LOWER($${paramIndex}))`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  if (filters?.category && filters.category !== 'Todas') {
    conditions.push(`category = $${paramIndex}`);
    params.push(filters.category);
    paramIndex++;
  }
  if (filters?.status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }
  if (filters?.availableOnly) {
    conditions.push(`status = 'Disponible' AND (maintenance_alert = false OR maintenance_alert IS NULL)`);
  }
  if (filters?.maintenanceOnly) {
    conditions.push(`(maintenance_alert = true OR status IN ('En mantenimiento', 'Requiere Mantenimiento'))`);
  }
  if (filters?.unbundledOnly) {
    conditions.push(`bundle_id IS NULL`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRes, assetsRes, categoriesRes] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM assets ${whereClause}`,
      params
    ),
    query(
      `SELECT * FROM assets ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    ),
    query<{ category: string }>(`SELECT DISTINCT category FROM assets WHERE category IS NOT NULL AND category != '' ORDER BY category`),
  ]);

  const total = Number(countRes.rows[0]?.count ?? 0);
  const assets = (assetsRes.rows ?? []) as Record<string, unknown>[];
  const categories = (categoriesRes.rows ?? []).map(r => r.category).filter(Boolean) as string[];

  return { assets, total, page, limit, categories };
}

/** Obtiene un activo por ID (o null si no existe). */
export async function getAssetById(id: string): Promise<Record<string, unknown> | null> {
  const result = await query(`SELECT * FROM assets WHERE id = $1`, [id]);
  return (result.rows[0] as Record<string, unknown>) ?? null;
}

/** Calcula la siguiente tag secuencial con prefijo ZF-XYZ. */
export async function getNextTag(): Promise<string> {
  const result = await query<{ tag: string }>(
    `SELECT tag FROM assets WHERE tag LIKE 'ZF-%' ORDER BY created_at DESC LIMIT 1`
  );
  const row = result.rows[0];
  if (!row) return 'ZF-001';
  const match = row.tag?.match(/ZF-(\d+)/);
  const num = match ? parseInt(match[1], 10) : 0;
  return `ZF-${String(num + 1).padStart(3, '0')}`;
}

/** Crea un nuevo activo con valores por defecto y registra auditoría y notificación. */
export async function addAsset(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const tag = (payload.tag as string) || (await getNextTag());
  const status = payload.status ?? 'Disponible';
  const usage_count = 0;
  const maintenance_period_days = (payload.maintenance_period_days as number) ?? 180;
  const next_maintenance_date =
    (payload.next_maintenance_date as string) ||
    toDateString(new Date(Date.now() + maintenance_period_days * 24 * 60 * 60 * 1000));
  const result = await query(
    `INSERT INTO assets (tag, name, description, category, brand, model, serial, part_number, project,
      commercial_value, invoice, import_type, status, image, location, maintenance_period_days,
      next_maintenance_date, usage_count, maintenance_usage_threshold, maintenance_alert, bundle_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
     RETURNING *`,
    [
      tag,
      payload.name ?? 'Sin nombre',
      payload.description ?? null,
      payload.category ?? null,
      payload.brand ?? null,
      payload.model ?? null,
      payload.serial ?? null,
      payload.part_number ?? null,
      payload.project ?? null,
      payload.commercial_value ?? null,
      payload.invoice ?? null,
      payload.import_type ?? null,
      status,
      payload.image ?? null,
      payload.location ?? null,
      maintenance_period_days,
      next_maintenance_date,
      usage_count,
      payload.maintenance_usage_threshold ?? null,
      payload.maintenance_alert ?? false,
      payload.bundle_id ?? null,
    ]
  );
  const row = result.rows[0] as Record<string, unknown>;
  await logAudit('CREATE', 'system', 'Admin', row.id as string, 'ASSET', `Nuevo: ${payload.name}`);
  await notifyByRole('ADMIN_PATRIMONIAL', 'Nuevo Activo Registrado', `${payload.name} (${tag}).`, 'INFO');
  return row;
}

/** Actualiza campos permitidos de un activo. */
export async function updateAsset(
  id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const allowed = [
    'name', 'description', 'category', 'brand', 'model', 'serial', 'part_number',
    'project', 'commercial_value', 'invoice', 'status', 'image', 'location',
    'maintenance_period_days', 'next_maintenance_date', 'maintenance_usage_threshold',
    'maintenance_alert', 'bundle_id',
  ];
  const set: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      let val = updates[key];
      if (key === 'next_maintenance_date' && typeof val === 'string' && val.includes('T')) {
        val = val.split('T')[0];
      }
      set.push(`${key} = $${i++}`);
      values.push(val);
    }
  }
  if (set.length === 0) return;
  values.push(id);
  await query(`UPDATE assets SET ${set.join(', ')} WHERE id = $${i}`, values);
}

/** Elimina un activo. */
export async function deleteAsset(id: string): Promise<void> {
  await query(`UPDATE assets SET status = 'Dada de baja' WHERE id = $1`, [id]);
}

/** Importa activos desde un array de filas (CSV). Devuelve cantidad insertada. */
export async function importAssets(rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const nextDate = toDateString(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000));
  for (const r of rows) {
    const tag = (r.tag as string) || (await getNextTag());
    await query(
      `INSERT INTO assets (name, tag, category, serial, status, next_maintenance_date)
       VALUES ($1, $2, $3, $4, 'Disponible', $5)`,
      [
        r.name ?? 'Sin nombre',
        tag,
        r.category ?? 'General',
        r.serial ?? null,
        nextDate,
      ]
    );
  }
  return rows.length;
}

/** Valida el mantenimiento de un activo y actualiza next_maintenance_date. */
export async function validateMaintenanceAsset(
  assetId: string,
  maintenancePeriodDays: number
): Promise<void> {
  const nextDate = toDateString(
    new Date(Date.now() + (maintenancePeriodDays || 180) * 24 * 60 * 60 * 1000)
  );
  await query(
    `UPDATE assets SET status = 'Disponible', maintenance_alert = false, usage_count = 0, next_maintenance_date = $1
     WHERE id = $2`,
    [nextDate, assetId]
  );
}
