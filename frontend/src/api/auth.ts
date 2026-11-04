import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export type ApiRole = 'admin' | 'user';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: ApiRole;
}

export interface AuthPayload {
  token: string;
  token_type: string;
  user: ApiUser;
}

export async function apiLogin(email: string, password: string): Promise<AuthPayload> {
  const { data } = await apiClient.post<ApiResponse<AuthPayload>>('/auth/login', {
    email,
    password,
  });

  return data.data;
}

export async function apiRegister(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<AuthPayload> {
  const { data } = await apiClient.post<ApiResponse<AuthPayload>>('/auth/register', {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });

  return data.data;
}

export async function apiLogout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function apiMe(): Promise<ApiUser> {
  const { data } = await apiClient.get<ApiResponse<{ user: ApiUser }>>('/auth/me');
  return data.data.user;
}
