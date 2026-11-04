import axios, { type AxiosError } from 'axios';
import { readToken } from '../auth/session-store';

/**
 * URL backend diambil dari environment variable VITE_API_BASE_URL.
 * Jangan menulis URL API langsung di komponen; gunakan `apiClient`.
 */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    'VITE_API_BASE_URL belum diatur. Salin frontend/.env.example menjadi frontend/.env, ' +
      'lalu jalankan ulang dev server (npm run dev).',
  );
}

export const API_BASE_URL = apiBaseUrl;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
});

/* Setiap request otomatis membawa token Sanctum bila pengguna sudah login. */
apiClient.interceptors.request.use((config) => {
  const token = readToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/* Token dicabut/kedaluwarsa → beri tahu AuthProvider lewat event global. */
apiClient.interceptors.response.use(undefined, (error: AxiosError) => {
  if (error.response?.status === 401 && readToken()) {
    window.dispatchEvent(new Event('eatersive:unauthorized'));
  }

  return Promise.reject(error);
});

interface BackendErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Mengubah error Axios/JavaScript menjadi pesan yang bisa ditampilkan ke pengguna.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<BackendErrorBody>;

    if (axiosError.code === 'ERR_NETWORK') {
      return `Tidak dapat terhubung ke backend di ${apiBaseUrl}. Pastikan backend sudah berjalan dengan "php artisan serve" dan CORS mengizinkan origin frontend.`;
    }

    if (axiosError.code === 'ECONNABORTED') {
      return 'Permintaan ke backend melebihi batas waktu 15 detik.';
    }

    const body = axiosError.response?.data;
    const firstValidationError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
    const backendMessage = firstValidationError ?? body?.message;

    if (backendMessage) {
      const status = axiosError.response?.status;
      return status ? `${backendMessage} (HTTP ${status})` : backendMessage;
    }

    if (axiosError.response?.status) {
      return `Backend merespons dengan status HTTP ${axiosError.response.status}.`;
    }

    return axiosError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan yang tidak diketahui.';
}
