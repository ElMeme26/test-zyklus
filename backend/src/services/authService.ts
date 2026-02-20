import { query } from '../db/index.js';
import type { User } from '../types/index.js';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, name, email, role, disciplina, avatar, phone, manager_id, created_at
     FROM users WHERE email = $1`,
    [email]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    disciplina: row.disciplina,
    avatar: row.avatar,
    phone: row.phone,
    manager_id: row.manager_id,
    created_at: row.created_at,
  };
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
