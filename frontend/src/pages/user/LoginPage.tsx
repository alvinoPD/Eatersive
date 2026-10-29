import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Brand from '../../components/shared/Brand';
import useAuth from '../../auth/useAuth';
import { ROLE_HOME } from '../../auth/roles';
import type { AuthRole } from '../../types/auth';
import '../../styles/login.css';

interface LoginLocationState {
  from?: string;
}

function resolveRedirect(role: AuthRole, from?: string): string {
  if (from && from !== '/login') {
    if (role === 'owner' && from.startsWith('/owner')) return from;
    if (role === 'user' && !from.startsWith('/owner')) return from;
  }

  return ROLE_HOME[role];
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, login } = useAuth();
  const from = (location.state as LoginLocationState | null)?.from;

  const [email, setEmail] = useState(session?.email ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.title = 'Masuk ke Akun — EaterSive';
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPending(true);
    setMessage('');

    const result = await login(email, password, remember);

    setPending(false);

    if (!result.ok) {
      setMessageIsError(true);
      setMessage(result.message);
      return;
    }

    setMessageIsError(false);
    navigate(resolveRedirect(result.session.role, from), { replace: true });
  }

  return (
    <div id="page-login">
      <main className="login-page">
        <section className="login-card" aria-labelledby="login-title">
          <Brand label="Kembali ke EaterSive" />

          <div className="login-heading">
            <h1 id="login-title">Masuk ke Akun Anda</h1>
            <p>
              Gunakan akun owner atau pelanggan
              <br className="desktop-break" /> untuk melanjutkan ke EaterSive.
            </p>
          </div>

          {from && (
            <p className="login-notice" role="status">
              Anda perlu masuk untuk membuka halaman <strong>{from}</strong>.
            </p>
          )}

          <form className="login-form" id="login-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="email">Alamat Email</label>
              <div className="input-wrap">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="3.5"
                    y="5.5"
                    width="17"
                    height="13"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="m5 7 7 5.5L19 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nama@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <div className="label-row">
                <label htmlFor="password">Kata Sandi</label>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setMessageIsError(false);
                    setMessage('Fitur reset kata sandi belum tersedia. Hubungi admin EaterSive.');
                  }}
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="input-wrap">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="4.5"
                    y="10"
                    width="15"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 10V7a4 4 0 0 1 8 0v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((isVisible) => !isVisible)}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </button>
              </div>
            </div>

            <label className="remember-option" htmlFor="remember">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>Ingat saya di perangkat ini</span>
            </label>

            <button className="submit-button" type="submit" disabled={pending}>
              {pending ? 'Memproses…' : 'Masuk ke Akun'}
            </button>
            <p
              className={`form-message${messageIsError ? ' is-error' : ''}`}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          </form>

          <div className="divider">
            <span>Atau lanjut dengan</span>
          </div>

          <div className="social-login">
            <button
              className="social-button"
              type="button"
              onClick={() => {
                setMessageIsError(false);
                setMessage('Login dengan Google belum terhubung.');
              }}
            >
              <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.72-.06-1.42-.19-2.09H12v3.95h5.38a4.6 4.6 0 0 1-2 3.02v2.47h3.23c1.89-1.74 2.99-4.3 2.99-7.35Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.47c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.55A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.41 13.95a6 6 0 0 1 0-3.9V7.5H3.06a10 10 0 0 0 0 9l3.35-2.55Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.93c1.47 0 2.79.5 3.83 1.52l2.87-2.87C16.96 2.96 14.69 2 12 2a10 10 0 0 0-8.94 5.5l3.35 2.55C7.2 7.69 9.4 5.93 12 5.93Z"
                />
              </svg>
              Google
            </button>
            <button
              className="social-button"
              type="button"
              onClick={() => {
                setMessageIsError(false);
                setMessage('Login dengan Facebook belum terhubung.');
              }}
            >
              <svg className="facebook-icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="currentColor" />
                <path
                  fill="#fff"
                  d="M13.45 19v-6.37h2.14l.32-2.48h-2.46V8.57c0-.72.2-1.21 1.23-1.21h1.32V5.14c-.23-.03-1.05-.1-2-.1-1.98 0-3.34 1.2-3.34 3.42v1.69H8.42v2.48h2.24V19h2.79Z"
                />
              </svg>
              Facebook
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
