import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export interface OwnerDashboardSummary {
  total_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  processing_orders: number;
  quality_check_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  recent_orders: Array<{
    id: number;
    kode_pesanan: string | null;
    nama: string;
    layanan: string | null;
    status: string;
    status_label: string;
    total_harga: number;
    created_at: string;
  }>;
}

export interface OwnerProfile {
  id: number;
  name: string;
  email: string;
  nomor_telp: string | null;
  role: string;
  created_at: string | null;
}

export interface OwnerProfileInput {
  name?: string;
  email?: string;
  nomor_telp?: string | null;
}

export interface OwnerPasswordInput {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export async function fetchOwnerDashboard(): Promise<OwnerDashboardSummary> {
  const { data } = await apiClient.get<ApiResponse<OwnerDashboardSummary>>('/owner/dashboard');
  return data.data;
}

export async function fetchOwnerProfile(): Promise<OwnerProfile> {
  const { data } = await apiClient.get<ApiResponse<OwnerProfile>>('/owner/profile');
  return data.data;
}

export async function updateOwnerProfile(input: OwnerProfileInput): Promise<OwnerProfile> {
  const { data } = await apiClient.put<ApiResponse<OwnerProfile>>('/owner/profile', input);
  return data.data;
}

export async function changeOwnerPassword(input: OwnerPasswordInput): Promise<void> {
  await apiClient.put('/owner/password', input);
}
