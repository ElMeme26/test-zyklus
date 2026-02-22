import { query } from '../db/index.js';
import type { User, UserRole } from '../types/index.js';
import { hashPassword } from './authService.js';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  disciplina: string | null;
  avatar: string | null;
  phone: string | null;
  manager_id: string | null;
  created_at: string | null;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    disciplina: row.disciplina ?? '',
    avatar: row.avatar ?? undefined,
    phone: row.phone ?? undefined,
    manager_id: row.manager_id ?? undefined,
    created_at: row.created_at ?? undefined,
  };
}

export interface ListUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  disciplina?: string;
}

export interface ListUsersResult {
  users: User[];
  total: number;
}

export async function listUsers(): Promise<User[]> {
  const result = await query<UserRow>(
    `SELECT id, name, email, role, disciplina, avatar, phone, manager_id, created_at
     FROM users ORDER BY name`
  );
  return result.rows.map(rowToUser);
}

export async function listUsersPaginated(filters: ListUsersFilters): Promise<ListUsersResult> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;
  const search = filters.search?.trim();
  const role = filters.role;
  const disciplina = filters.disciplina?.trim();

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  if (role) {
    conditions.push(`role = $${paramIndex}`);
    params.push(role);
    paramIndex++;
  }
  if (disciplina) {
    conditions.push(`disciplina ILIKE $${paramIndex}`);
    params.push(`%${disciplina}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM users WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  params.push(limit, offset);
  const result = await query<UserRow>(
    `SELECT id, name, email, role, disciplina, avatar, phone, manager_id, created_at
     FROM users WHERE ${whereClause}
     ORDER BY name
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
  return { users: result.rows.map(rowToUser), total };
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await query<UserRow>(
    `SELECT id, name, email, role, disciplina, avatar, phone, manager_id, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? rowToUser(row) : null;
}

export async function createUser(data: {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  disciplina?: string;
  phone?: string;
  manager_id?: string;
}): Promise<User> {
  const password_hash = await hashPassword(data.password);
  const result = await query<UserRow>(
    `INSERT INTO users (name, email, role, password_hash, disciplina, phone, manager_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, email, role, disciplina, avatar, phone, manager_id, created_at`,
    [
      data.name,
      data.email,
      data.role,
      password_hash,
      data.disciplina ?? null,
      data.phone ?? null,
      data.manager_id ?? null,
    ]
  );
  return rowToUser(result.rows[0]);
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    role?: UserRole;
    disciplina?: string;
    phone?: string;
    manager_id?: string;
    password?: string;
  }
): Promise<User | null> {
  const existing = await getUserById(id);
  if (!existing) return null;

  const name = data.name !== undefined ? data.name : existing.name;
  const role = data.role !== undefined ? data.role : existing.role;
  const disciplina = data.disciplina !== undefined ? data.disciplina : (existing.disciplina ?? '');
  const phone = data.phone !== undefined ? data.phone : existing.phone;
  const manager_id = data.manager_id !== undefined ? data.manager_id : existing.manager_id;

  if (data.password !== undefined && data.password !== '') {
    const password_hash = await hashPassword(data.password);
    await query(
      `UPDATE users SET name = $2, role = $3, disciplina = $4, phone = $5, manager_id = $6, password_hash = $7 WHERE id = $1`,
      [id, name, role, disciplina || null, phone || null, manager_id || null, password_hash]
    );
  } else {
    await query(
      `UPDATE users SET name = $2, role = $3, disciplina = $4, phone = $5, manager_id = $6 WHERE id = $1`,
      [id, name, role, disciplina || null, phone || null, manager_id || null]
    );
  }
  return getUserById(id);
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await query('DELETE FROM users WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
