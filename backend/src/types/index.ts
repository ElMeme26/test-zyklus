export type UserRole =
  | 'AUDITOR'
  | 'ADMIN_PATRIMONIAL'
  | 'LIDER_EQUIPO'
  | 'USUARIO'
  | 'GUARDIA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  disciplina?: string;
  avatar?: string;
  phone?: string;
  manager_id?: string;
  created_at?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
