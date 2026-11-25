import { apiClient } from './client';
import type { ApiResponse } from '../types/api';
import type { PhotoSide } from './orders';

export interface OwnerDashboardSummary {
  total_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  processing_orders: number;
  quality_check_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  total_discount: number;
  member_count: number;
  active_customers: number;
  queue_count: number;
  recent_orders: Array<{
    id: number;
    kode_pesanan: string | null;
    nama: string;
    layanan: string | null;
    status: string;
    status_label: string;
    total_harga: number;
    metode_pembayaran: string | null;
    status_pembayaran: string | null;
    created_at: string;
  }>;
  recent_photos: Array<{
    id: number;
    url: string;
    sisi: PhotoSide;
    kode_grup: string;
    kode_pesanan: string | null;
    created_at: string | null;
  }>;
  monthly: Array<{
    month: string;
    label: string;
    orders: number;
    revenue: number;
  }>;
}

export interface MembershipPlan {
  id: number;
  nama: string;
  deskripsi: string | null;
  harga: number | string;
  durasi_hari: number;
  diskon_persen: number;
  aktif: boolean;
}

export interface OwnerMember {
  id: number;
  name: string;
  email: string;
  nomor_telp: string | null;
  is_member: boolean;
  plan_id: number | null;
  plan_name: string | null;
  diskon_persen: number;
  member_since: string | null;
  member_until: string | null;
  total_orders: number;
  total_spend: number;
  last_order_at: string | null;
}

export interface OwnerMembersResponse {
  members: OwnerMember[];
  plans: MembershipPlan[];
  stats: {
    total_customers: number;
    active_members: number;
    total_discount: number;
  };
}

export interface MembershipPlanInput {
  nama: string;
  deskripsi?: string | null;
  harga: number;
  durasi_hari: number;
  diskon_persen: number;
  aktif?: boolean;
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

export async function fetchOwnerMembers(q?: string): Promise<OwnerMembersResponse> {
  const { data } = await apiClient.get<ApiResponse<OwnerMembersResponse>>('/owner/members', {
    params: q ? { q } : undefined,
  });
  return data.data;
}

export async function updateOwnerMember(
  userId: number,
  input: {
    plan_id?: number | null;
    aktif?: boolean;
    diskon_persen?: number | null;
    durasi_hari?: number | null;
    catatan?: string | null;
  },
): Promise<OwnerMember> {
  const { data } = await apiClient.put<ApiResponse<OwnerMember>>(
    `/owner/members/${userId}`,
    input,
  );
  return data.data;
}

export async function fetchMembershipPlans(): Promise<MembershipPlan[]> {
  const { data } = await apiClient.get<ApiResponse<MembershipPlan[]>>('/membership-plans');
  return data.data;
}

export async function createMembershipPlan(input: MembershipPlanInput): Promise<MembershipPlan> {
  const { data } = await apiClient.post<ApiResponse<MembershipPlan>>(
    '/owner/membership-plans',
    input,
  );
  return data.data;
}

export async function updateMembershipPlan(
  planId: number,
  input: Partial<MembershipPlanInput>,
): Promise<MembershipPlan> {
  const { data } = await apiClient.put<ApiResponse<MembershipPlan>>(
    `/owner/membership-plans/${planId}`,
    input,
  );
  return data.data;
}

export async function deleteMembershipPlan(planId: number): Promise<void> {
  await apiClient.delete(`/owner/membership-plans/${planId}`);
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
