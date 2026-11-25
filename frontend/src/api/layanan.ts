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

export async function fetchLayanan(includeInactive = false): Promise<Layanan[]> {
  const { data } = await apiClient.get<ApiResponse<Layanan[]>>('/layanan', {
    params: includeInactive ? { include_inactive: 1 } : undefined,
  });
  return data.data;
}

export async function fetchLayananById(id: string | number): Promise<Layanan> {
  const { data } = await apiClient.get<ApiResponse<Layanan>>(`/layanan/${id}`);
  return data.data;
}

export async function createLayanan(
  input: LayananInput,
  photoFile?: File | null,
): Promise<Layanan> {
  if (!photoFile) {
    const { data } = await apiClient.post<ApiResponse<Layanan>>('/layanan', input);
    return data.data;
  }

  const formData = new FormData();
  formData.append('nama', input.nama);
  formData.append('deskripsi', input.deskripsi ?? '');
  formData.append('harga', String(input.harga));
  formData.append('kategori', input.kategori ?? '');
  formData.append('estimasi', input.estimasi ?? '');
  formData.append('aktif', input.aktif === false ? '0' : '1');
  formData.append('foto', photoFile);

  const { data } = await apiClient.post<ApiResponse<Layanan>>('/layanan', formData);
  return data.data;
}

export async function updateLayanan(
  id: string | number,
  input: Partial<LayananInput>,
): Promise<Layanan> {
  const { data } = await apiClient.put<ApiResponse<Layanan>>(`/layanan/${id}`, input);
  return data.data;
}

export async function uploadLayananPhoto(
  id: string | number,
  file: File,
): Promise<Layanan> {
  const formData = new FormData();
  formData.append('foto', file);

  const { data } = await apiClient.post<ApiResponse<Layanan>>(`/layanan/${id}/foto`, formData);
  return data.data;
}

export async function deleteLayanan(id: string | number): Promise<void> {
  await apiClient.delete(`/layanan/${id}`);
}
