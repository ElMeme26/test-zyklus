import { apiFetch } from './client';
import type { User } from '../types';

export interface LoginResponse {
  user: User;
  token: string;
}

/** Inicia sesión y devuelve usuario y token JWT. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
