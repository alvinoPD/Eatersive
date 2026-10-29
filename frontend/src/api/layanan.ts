import { apiClient } from './client';
import type { ApiResponse } from '../types/api';
import type { CatalogService, ServiceCategory } from '../types/eatersive';

/** Bentuk data layanan dari backend Laravel (`daftar_layanans`). */
export interface Layanan {
  id: number;
  foto: string | null;
  nama: string;
  deskripsi: string | null;
  harga: number | string;
  kategori: string | null;
  estimasi: string | null;
  aktif: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LayananInput {
  nama: string;
  deskripsi?: string | null;
  harga: number;
  kategori?: string;
  estimasi?: string;
  aktif?: boolean;
  foto?: string | null;
}

export const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=85';

/** Mengubah data backend (nama/harga) menjadi tipe UI (name/price). */
export function toCatalogService(item: Layanan): CatalogService {
  const price = Number(item.harga);
  const image = item.foto || FALLBACK_IMAGE;
  const category = (item.kategori ?? 'Cleaning') as ServiceCategory;

  return {
    id: String(item.id),
    name: item.nama,
    description: item.deskripsi ?? '',
    category,
    price,
    priceLabel: `Rp ${price.toLocaleString('id-ID')}`,
    estimate: item.estimasi ?? '2–3 Hari',
    rating: 0,
    reviewCount: 0,
    image,
    thumbnail: image,
    search: `${item.nama} ${item.deskripsi ?? ''} ${category}`.toLocaleLowerCase('id'),
  };
}

export async function fetchLayanan(): Promise<Layanan[]> {
  const { data } = await apiClient.get<ApiResponse<Layanan[]>>('/layanan');
  return data.data;
}

export async function fetchLayananById(id: string | number): Promise<Layanan> {
  const { data } = await apiClient.get<ApiResponse<Layanan>>(`/layanan/${id}`);
  return data.data;
}

export async function createLayanan(input: LayananInput): Promise<Layanan> {
  const { data } = await apiClient.post<ApiResponse<Layanan>>('/layanan', input);
  return data.data;
}

export async function updateLayanan(
  id: string | number,
  input: Partial<LayananInput>,
): Promise<Layanan> {
  const { data } = await apiClient.put<ApiResponse<Layanan>>(`/layanan/${id}`, input);
  return data.data;
}

export async function deleteLayanan(id: string | number): Promise<void> {
  await apiClient.delete(`/layanan/${id}`);
}
