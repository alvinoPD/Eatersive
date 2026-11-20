import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'quality_check'
  | 'completed'
  | 'cancelled';

export interface OrderService {
  id: number;
  nama: string;
  foto: string | null;
  kategori: string | null;
  estimasi: string | null;
  harga: number;
}

export interface OrderPayment {
  id: number;
  metode_pembayaran: string | null;
  status_pembayaran: string;
  jumlah: number;
  tanggal_bayar: string | null;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  status_label: string;
  catatan: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  kode_pesanan: string | null;
  kode_grup: string | null;
  nama: string;
  nomor_telp: string | null;
  alamat: string | null;
  catatan: string | null;
  status: OrderStatus;
  status_label: string;
  jumlah: number;
  total_harga: number;
  estimasi_selesai: string | null;
  created_at: string;
  updated_at: string;
  layanan: OrderService | null;
  pembayaran: OrderPayment | null;
  timeline?: OrderTimelineEntry[];
}

export interface CreateOrderInput {
  layanan_id: number;
  jumlah: number;
  nama: string;
  nomor_telp: string;
  alamat: string;
  catatan?: string;
  metode_pembayaran?: 'qris' | 'va' | 'ewallet';
  kode_grup?: string;
}

export async function fetchMyOrders(): Promise<Order[]> {
  const { data } = await apiClient.get<ApiResponse<Order[]>>('/orders');
  return data.data;
}

export async function fetchOrderDetail(id: number | string): Promise<Order> {
  const { data } = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
  return data.data;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { data } = await apiClient.post<ApiResponse<Order>>('/orders', input);
  return data.data;
}

export async function fetchOwnerOrders(): Promise<Order[]> {
  const { data } = await apiClient.get<ApiResponse<Order[]>>('/owner/orders');
  return data.data;
}

export async function updateOrderStatus(
  id: number | string,
  status: OrderStatus,
  catatan?: string,
): Promise<Order> {
  const { data } = await apiClient.patch<ApiResponse<Order>>(`/orders/${id}/status`, {
    status,
    catatan: catatan?.trim() ? catatan.trim() : null,
  });

  return data.data;
}

export const ORDER_STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'processing', label: 'Sedang Dikerjakan' },
  { value: 'quality_check', label: 'Pengecekan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export function formatOrderDate(value: string | null): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatOrderDateTime(value: string | null): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
