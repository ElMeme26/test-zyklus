import { query } from '../db/index.js';

export async function createBundle(
  name: string,
  description: string,
  assetIds: string[]
): Promise<Record<string, unknown>> {
  const result = await query(
    `INSERT INTO bundles (name, description) VALUES ($1, $2) RETURNING *`,
    [name, description ?? null]
  );
  const bundle = result.rows[0] as Record<string, unknown>;
  if (assetIds.length > 0) {
    for (const aid of assetIds) {
      await query(`UPDATE assets SET bundle_id = $1 WHERE id = $2`, [bundle.id, aid]);
    }
  }
  return bundle;
}

export async function updateBundle(
  id: string,
  patch: { name?: string; description?: string; assetIds?: string[] }
): Promise<Record<string, unknown> | null> {
  const updates: string[] = [];
  const values: (string | null | string[])[] = [];
  let i = 1;
  if (patch.name !== undefined) {
    updates.push(`name = $${i++}`);
    values.push(patch.name);
  }
  if (patch.description !== undefined) {
    updates.push(`description = $${i++}`);
    values.push(patch.description ?? null);
  }
  if (updates.length === 0 && !patch.assetIds) return null;

  if (patch.assetIds !== undefined) {
    await query(`UPDATE assets SET bundle_id = NULL WHERE bundle_id = $1`, [id]);
    const ids = patch.assetIds;
    if (ids.length > 0) {
      for (const aid of ids) {
        await query(`UPDATE assets SET bundle_id = $1 WHERE id = $2`, [id, aid]);
      }
    }
  }

  if (updates.length === 0) {
    const result = await query(`SELECT * FROM bundles WHERE id = $1`, [id]);
    return (result.rows[0] as Record<string, unknown>) ?? null;
  }
  values.push(id);
  const result = await query(
    `UPDATE bundles SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return (result.rows[0] as Record<string, unknown>) ?? null;
}
