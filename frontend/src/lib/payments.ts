import { apiClient } from '../api/client';
import type { ApiResponse } from '../types/api';

/*
 * Modul pembayaran Midtrans (Tahap 4):
 * - chargeOrderPayment(): minta snap_token ke backend (POST /pembayaran/charge)
 * - refreshOrderPaymentStatus(): polling status (GET /pembayaran/{id}/status)
 * - loadSnapScript() + payWithSnap(): buka popup pembayaran Midtrans
 */

export interface PaymentChargeResult {
  order_id: string;
  gross_amount: number;
  /** Token Snap untuk window.snap.pay(). */
  snap_token: string;
  redirect_url: string;
  /** Client key Midtrans (publik), dikirim dari backend. */
  client_key: string;
  is_production: boolean;
}

/** Muat snap.js sekali saja (berkas global, butuh client key publik). */
let snapScriptLoading: Promise<void> | null = null;

export function loadSnapScript(clientKey: string, isProduction: boolean): Promise<void> {
  if (snapScriptLoading) return snapScriptLoading;

  const snapUrl = isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

  snapScriptLoading = new Promise((resolve, reject) => {
    if (window.snap) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = snapUrl;
    script.dataset.clientKey = clientKey;
    script.onload = () => resolve();
    script.onerror = () => {
      snapScriptLoading = null;
      reject(new Error('Gagal memuat skrip pembayaran Midtrans.'));
    };
    document.body.appendChild(script);
  });

  return snapScriptLoading;
}

interface SnapPayOptions {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}

/** Buka popup Midtrans dengan snap_token dari backend. */
export function payWithSnap(snapToken: string, options: SnapPayOptions = {}): void {
  if (!window.snap) {
    throw new Error('Skrip pembayaran Midtrans belum termuat.');
  }

  window.snap.pay(snapToken, {
    onSuccess: options.onSuccess,
    onPending: options.onPending,
    onError: options.onError,
    onClose: options.onClose,
  });
}

/** Minta token transaksi Midtrans untuk satu grup checkout. */
export async function chargeOrderPayment(kodeGrup: string): Promise<PaymentChargeResult> {
  const { data } = await apiClient.post<ApiResponse<PaymentChargeResult>>(
    '/pembayaran/charge',
    { kode_grup: kodeGrup },
  );

  return data.data;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: SnapPayOptions) => void;
      hide?: () => void;
    };
  }
}

/** Polling status pembayaran: backend mengecek ke Midtrans lalu sinkron. */
export async function refreshOrderPaymentStatus<T>(orderId: number): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(`/pembayaran/${orderId}/status`);
  return data.data;
}
