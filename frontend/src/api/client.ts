import axios, { type AxiosError } from 'axios';

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
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
  },
});

interface BackendErrorBody {
  message?: string;
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
      return 'Permintaan ke backend melebihi batas waktu 10 detik.';
    }

    const status = axiosError.response?.status;
    const backendMessage = axiosError.response?.data?.message;

    if (backendMessage) {
      return status ? `${backendMessage} (HTTP ${status})` : backendMessage;
    }

    if (status) {
      return `Backend merespons dengan status HTTP ${status}.`;
    }

    return axiosError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan yang tidak diketahui.';
}
