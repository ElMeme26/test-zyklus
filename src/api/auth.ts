import { apiFetch } from './client';
import type { User } from '../types';

export interface LoginResponse {
  user: User;
  token: string;
}

export async function login(email: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
