/**
 * Bentuk response standar dari Laravel API.
 *
 * Semua endpoint di template ini mengembalikan struktur:
 * { success, message, data }
 */
export interface ApiResponse<TData> {
  success: boolean;
  message: string;
  data: TData;
}

/** Data yang dikembalikan endpoint GET /api/v1/health. */
export interface HealthData {
  status: string;
}

export type HealthResponse = ApiResponse<HealthData>;
