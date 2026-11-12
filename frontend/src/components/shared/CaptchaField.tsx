import { useCallback, useEffect, useState } from 'react';
import {
  fetchCaptcha,
  type CaptchaChallenge,
  type CaptchaContext,
  type CaptchaValue,
} from '../../api/captcha';
import { getApiErrorMessage } from '../../api/client';
import '../../styles/captcha.css';

interface CaptchaFieldProps {
  context: CaptchaContext;
  value: CaptchaValue;
  /** Kirim setter state langsung (mis. `setCaptcha`), jangan arrow function. */
  onChange: (value: CaptchaValue) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Naikkan angka ini dari parent untuk memaksa soal baru. */
  resetSignal?: number;
}

export default function CaptchaField({
  context,
  value,
  onChange,
  disabled = false,
  invalid = false,
  resetSignal = 0,
}: CaptchaFieldProps) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const next = await fetchCaptcha(context);
      setChallenge(next);
      onChange({ id: next.id, answer: '' });
    } catch (requestError) {
      setChallenge(null);
      onChange({ id: null, answer: '' });
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [context, onChange]);

  useEffect(() => {
    void load();
  }, [load, resetSignal]);

  return (
    <div className={`captcha-field${invalid ? ' is-invalid' : ''}`}>
      <div className="captcha-row">
        <p className="captcha-question" aria-live="polite">
          {loading ? 'Memuat soal…' : (challenge?.question ?? 'Soal tidak tersedia')}
        </p>
        <button
          className="captcha-refresh"
          type="button"
          onClick={() => void load()}
          disabled={disabled || loading}
        >
          Soal baru
        </button>
      </div>

      <input
        className="captcha-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label="Jawaban CAPTCHA"
        placeholder="Tulis jawaban di sini"
        value={value.answer}
        onChange={(event) =>
          onChange({
            ...value,
            answer: event.target.value.replace(/\D/g, '').slice(0, 6),
          })
        }
        disabled={disabled || loading || challenge === null}
        required
      />

      {challenge !== null && error === '' && (
        <p className="captcha-hint">
          Soal berlaku {challenge.ttl} detik dan hanya bisa dipakai sekali.
        </p>
      )}

      {error !== '' && (
        <p className="captcha-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}