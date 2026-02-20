import { query } from '../db/index.js';

export async function addInstitution(inst: Record<string, unknown>): Promise<void> {
  await query(
    `INSERT INTO institutions (name, contact_name, contact_email, contact_phone, address)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      inst.name ?? '',
      inst.contact_name ?? null,
      inst.contact_email ?? null,
      inst.contact_phone ?? null,
      inst.address ?? null,
    ]
  );
}

export async function updateInstitution(
  id: number,
  updates: Record<string, unknown>
): Promise<void> {
  const allowed = ['name', 'contact_name', 'contact_email', 'contact_phone', 'address'];
  const set: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      set.push(`${key} = $${i++}`);
      values.push(updates[key]);
    }
  }
  if (set.length === 0) return;
  values.push(id);
  await query(`UPDATE institutions SET ${set.join(', ')} WHERE id = $${i}`, values);
}

export async function deleteInstitution(id: number): Promise<void> {
  await query('DELETE FROM institutions WHERE id = $1', [id]);
}
