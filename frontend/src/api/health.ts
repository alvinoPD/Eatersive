import { apiClient } from './client';
import type { HealthResponse } from '../types/api';

/**
 * Mengambil status backend dari GET {VITE_API_BASE_URL}/health.
 */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health', { signal });

  return response.data;
}
