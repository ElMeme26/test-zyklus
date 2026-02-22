import bcrypt from 'bcrypt';
import { query } from '../db/index.js';
import type { User } from '../types/index.js';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const SALT_ROUNDS = 10;

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  disciplina: string | null;
  avatar: string | null;
  phone: string | null;
  manager_id: string | null;
  created_at: string | null;
  password_hash: string | null;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    disciplina: row.disciplina ?? undefined,
    avatar: row.avatar ?? undefined,
    phone: row.phone ?? undefined,
    manager_id: row.manager_id ?? undefined,
    created_at: row.created_at ?? undefined,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<UserRow>(
    `SELECT id, name, email, role, disciplina, avatar, phone, manager_id, created_at, password_hash
     FROM users WHERE email = $1`,
    [email]
  );
  const row = result.rows[0];
  if (!row) return null;
  return rowToUser(row);
}

/** Used by login: returns user and password_hash for verification. Never expose password_hash to client. */
export async function findUserByEmailForLogin(email: string): Promise<{ user: User; password_hash: string | null } | null> {
  const result = await query<UserRow>(
    `SELECT id, name, email, role, disciplina, avatar, phone, manager_id, created_at, password_hash
     FROM users WHERE email = $1`,
    [email]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { user: rowToUser(row), password_hash: row.password_hash };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function createToken(user: User): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role } as JwtPayload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
