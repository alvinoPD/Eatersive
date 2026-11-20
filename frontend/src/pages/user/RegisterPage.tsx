import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Brand from '../../components/shared/Brand';
import useAuth from '../../auth/useAuth';
import '../../styles/login.css';

/**
 * Halaman daftar akun pelanggan.
 *
 * Dipisah dari `/login` supaya form masuk dan form daftar tidak bertumpuk di
 * satu kartu. Stylesheet-nya sama (`login.css`, di-scope ke `.auth-page`),
 * jadi tampilan kedua halaman konsisten tanpa CSS tambahan.
 *
 * Akun yang berhasil dibuat TIDAK langsung dipakai untuk masuk: pengguna
 * diarahkan kembali ke `/login` dan memasukkan kredensialnya sendiri, supaya
 * data akun sempat tersimpan di database sebelum sesi dibuat.
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.title = 'Buat Akun — EaterSive';
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage('');

    if (password !== passwordConfirmation) {
      setMessageIsError(true);
      setMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setPending(true);

    const result = await register(name, email, password, passwordConfirmation);

    setPending(false);

    if (!result.ok) {
      setMessageIsError(true);
      setMessage(result.message);
      return;
    }

    setMessageIsError(false);

    /* Akun sudah tersimpan di database → pengguna masuk lewat halaman login. */
    navigate('/login', {
      replace: true,
      state: { registered: true, email: email.trim() },
    });
  }

  return (
    <div className="auth-page">
      <main className="login-page">
        <section className="login-card" aria-labelledby="register-title">
          <Brand label="Kembali ke EaterSive" />

          <div className="login-heading">
            <h1 id="register-title">Buat Akun Baru</h1>
            <p>
              Daftar sebagai pelanggan untuk memesan
              <br className="desktop-break" /> dan melacak cucian Anda. Setelah itu Anda
              masuk lewat halaman login.
            </p>
          </div>

          <form className="login-form" id="register-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="name">Nama Lengkap</label>
              <div className="input-wrap">
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Nama Anda"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="email">Alamat Email</label>
              <div className="input-wrap">
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
              <label htmlFor="password">Kata Sandi</label>
              <div className="input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 8 karakter"
                  autoComplete="new-password"
                  minLength={8}
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

            <div className="field-group">
              <label htmlFor="password_confirmation">Ulangi Kata Sandi</label>
              <div className="input-wrap">
                <input
                  id="password_confirmation"
                  name="password_confirmation"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi kata sandi"
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  required
                />
              </div>
            </div>

            <button className="submit-button" type="submit" disabled={pending}>
              {pending ? 'Memproses…' : 'Daftar Sekarang'}
            </button>
            <p
              className={`form-message${messageIsError ? ' is-error' : ''}`}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          </form>

          <p className="signup-link">
            Sudah punya akun? <Link to="/login">Masuk di sini</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
