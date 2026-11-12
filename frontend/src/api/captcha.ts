import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export type CaptchaContext = 'login' | 'checkout';

/** Nilai yang dipegang form: id challenge + jawaban pengguna. */
export interface CaptchaValue {
  id: number | null;
  answer: string;
}

export interface CaptchaChallenge {
  id: number;
  question: string;
  expires_at: string;
  ttl: number;
}

/**
 * Meminta soal CAPTCHA baru. Param `_` mencegah cache browser.
 */
export async function fetchCaptcha(context: CaptchaContext = 'login'): Promise<CaptchaChallenge> {
  const { data } = await apiClient.get<ApiResponse<CaptchaChallenge>>('/captcha', {
    params: { context, _: Date.now() },
  });

  return data.data;
}