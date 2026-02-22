import { apiFetch } from './client';
import type { User, UserRole } from '../types';

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  disciplina?: string;
}

export interface ListUsersResponse {
  users: User[];
  total: number;
}

export async function listUsers(): Promise<User[]> {
  const res = await apiFetch<ListUsersResponse>('/api/users');
  return res.users;
}

export async function listUsersPaginated(params: ListUsersParams): Promise<ListUsersResponse> {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.role) searchParams.set('role', params.role);
  if (params.disciplina) searchParams.set('disciplina', params.disciplina);
  const qs = searchParams.toString();
  return apiFetch<ListUsersResponse>(`/api/users${qs ? `?${qs}` : ''}`);
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  disciplina?: string;
  phone?: string;
  manager_id?: string;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  return apiFetch<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface UpdateUserPayload {
  name?: string;
  role?: UserRole;
  disciplina?: string;
  phone?: string;
  manager_id?: string;
  password?: string;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: string): Promise<void> {
  return apiFetch<{ ok: boolean }>(`/api/users/${id}`, { method: 'DELETE' }).then(() => undefined);
}
