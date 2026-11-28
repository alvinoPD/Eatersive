import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export type ReviewStatus = 'Dipublikasikan' | 'Menunggu' | 'Dilaporkan' | 'Disembunyikan';

export interface Review {
  id: number;
  isi_review: string;
  rating: number;
  status: ReviewStatus;
  owner_reply: string | null;
  kode_pesanan: string | null;
  created_at: string | null;
  user: { id: number; name: string } | null;
  layanan: { id: number; nama: string } | null;
}

export interface CreateReviewInput {
  layanan_id: number;
  isi_review: string;
  rating: number;
  kode_pesanan?: string | null;
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const { data } = await apiClient.post<ApiResponse<Review>>('/reviews', input);
  return data.data;
}

export async function fetchOwnerReviews(): Promise<Review[]> {
  const { data } = await apiClient.get<ApiResponse<Review[]>>('/owner/reviews');
  return data.data;
}

export async function updateOwnerReview(
  id: number,
  input: { status?: ReviewStatus; owner_reply?: string | null },
): Promise<Review> {
  const { data } = await apiClient.patch<ApiResponse<Review>>(`/owner/reviews/${id}`, input);
  return data.data;
}
