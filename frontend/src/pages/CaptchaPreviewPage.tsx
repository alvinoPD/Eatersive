import { useEffect, useState } from 'react';
import CaptchaField from '../components/shared/CaptchaField';
import type { CaptchaValue } from '../api/captcha';

/**
 * Halaman pratinjau CAPTCHA.
 *
 * Halaman ini hanya menguji pembuatan soal. Verifikasi tetap terjadi di backend
 * saat login/checkout, karena tidak ada endpoint verify publik.
 */
export default function CaptchaPreviewPage() {
  const [captcha, setCaptcha] = useState<CaptchaValue>({ id: null, answer: '' });
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    document.title = 'Pratinjau CAPTCHA — EaterSive';
  }, []);

  return (
    <div id="page-captcha">
      <main className="captcha-page">
        <article className="captcha-card">
          <h1>Pratinjau Local CAPTCHA</h1>
          <p>
            Soal di bawah dibuat oleh <code>GET /api/v1/captcha</code>. Jawaban tidak
            pernah dikirim ke browser; verifikasi hanya terjadi di endpoint login.
          </p>

          <CaptchaField
            context="login"
            value={captcha}
            onChange={setCaptcha}
            resetSignal={resetSignal}
          />

          <p className="captcha-status">
            ID challenge aktif: {captcha.id ?? '—'} · jawaban:{' '}
            {captcha.answer === '' ? '(kosong)' : captcha.answer}
          </p>

          <button
            className="captcha-secondary"
            type="button"
            onClick={() => setResetSignal((current) => current + 1)}
          >
            Minta soal baru
          </button>
        </article>
      </main>
    </div>
  );
}