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
