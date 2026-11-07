import { useEffect, useState, type FormEvent } from 'react';
import OwnerShell from '../../components/owner/OwnerShell';
import { getApiErrorMessage } from '../../api/client';
import {
  changeOwnerPassword,
  fetchOwnerProfile,
  updateOwnerProfile,
  type OwnerProfile,
} from '../../api/owner';
import useAuth from '../../auth/useAuth';
import '../../styles/owner-order-detail.css';
import '../../styles/owner-settings.css';

export default function OwnerSettingsPage() {
  const { session, updateSessionUser } = useAuth();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePending, setProfilePending] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileIsError, setProfileIsError] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordIsError, setPasswordIsError] = useState(false);

  useEffect(() => {
    document.title = 'Pengaturan Akun — EaterSive';
  }, []);

  useEffect(() => {
    let alive = true;

    fetchOwnerProfile()
      .then((data) => {
        if (!alive) return;
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
        setPhone(data.nomor_telp ?? '');
        setLoadError('');
      })
      .catch((error) => {
        if (!alive) return;
        setLoadError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profilePending) return;

    setProfilePending(true);
    setProfileMessage('');

    try {
      const updated = await updateOwnerProfile({
        name: name.trim(),
        email: email.trim(),
        nomor_telp: phone.trim() || null,
      });

      setProfile(updated);
      setName(updated.name);
      setEmail(updated.email);
      setPhone(updated.nomor_telp ?? '');
      updateSessionUser({ name: updated.name, email: updated.email });
      setProfileIsError(false);
      setProfileMessage('Profil berhasil diperbarui.');
    } catch (error) {
      setProfileIsError(true);
      setProfileMessage(getApiErrorMessage(error));
    } finally {
      setProfilePending(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordPending) return;

    if (newPassword !== confirmPassword) {
      setPasswordIsError(true);
      setPasswordMessage('Konfirmasi password belum sama.');
      return;
    }

    setPasswordPending(true);
    setPasswordMessage('');

    try {
      await changeOwnerPassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordIsError(false);
      setPasswordMessage('Password berhasil diperbarui. Sesi Anda tetap aktif.');
    } catch (error) {
      setPasswordIsError(true);
      setPasswordMessage(getApiErrorMessage(error));
    } finally {
      setPasswordPending(false);
    }
  }

  return (
    <OwnerShell
      pageId="page-owner-order-detail"
      shellClassName="detail-shell"
      activeNav="settings"
    >
      <main className="detail-content">
        <section className="page-heading" aria-labelledby="settings-title">
          <h1 id="settings-title">Pengaturan Akun</h1>
          <p>Kelola profil dan keamanan akun owner EaterSive.</p>
        </section>

        {loading && (
          <p className="empty-state" role="status">
            Memuat data akun…
          </p>
        )}

        {!loading && loadError && (
          <p className="empty-state" role="alert">
            {loadError}
          </p>
        )}

        {!loading && !loadError && profile && (
          <div className="detail-layout">
            <div className="detail-main">
              <section className="info-card" aria-labelledby="account-title">
                <h2 className="section-title" id="account-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
                  </svg>
                  Informasi Akun
                </h2>
                <dl className="settings-summary">
                  <div>
                    <dt>Email</dt>
                    <dd>{profile.email}</dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd>{profile.role === 'admin' ? 'Owner (admin)' : profile.role}</dd>
                  </div>
                  <div>
                    <dt>Terdaftar sejak</dt>
                    <dd>
                      {profile.created_at
                        ? new Intl.DateTimeFormat('id-ID', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          }).format(new Date(profile.created_at))
                        : '—'}
                    </dd>
                  </div>
                </dl>
                <p className="settings-hint">
                  Sesi aktif atas nama <strong>{session?.name ?? profile.name}</strong>.
                </p>
              </section>

              <section className="info-card" aria-labelledby="profile-title">
                <h2 className="section-title" id="profile-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 20h16M6 16l10-10 3 3-10 10H6v-3Z" />
                  </svg>
                  Profil Owner
                </h2>
                <form onSubmit={handleProfileSubmit}>
                  <label className="form-label" htmlFor="owner-name">
                    Nama
                  </label>
                  <input
                    id="owner-name"
                    className="status-select"
                    type="text"
                    name="name"
                    autoComplete="name"
                    maxLength={255}
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />

                  <label className="form-label note-label" htmlFor="owner-email">
                    Email
                  </label>
                  <input
                    id="owner-email"
                    className="status-select"
                    type="email"
                    name="email"
                    autoComplete="email"
                    maxLength={255}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />

                  <label className="form-label note-label" htmlFor="owner-phone">
                    Nomor Telepon
                  </label>
                  <input
                    id="owner-phone"
                    className="status-select"
                    type="tel"
                    name="nomor_telp"
                    autoComplete="tel"
                    maxLength={20}
                    placeholder="Contoh: 081234567890"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />

                  <p
                    className={`form-message${profileIsError ? ' is-error' : ''}`}
                    role="status"
                    aria-live="polite"
                  >
                    {profileMessage}
                  </p>

                  <button className="save-button" type="submit" disabled={profilePending}>
                    {profilePending ? 'Menyimpan…' : 'Simpan Profil'}
                  </button>
                </form>
              </section>

              <section className="info-card" aria-labelledby="password-title">
                <h2 className="section-title" id="password-title">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  Ubah Password
                </h2>
                <form onSubmit={handlePasswordSubmit}>
                  <label className="form-label" htmlFor="current-password">
                    Password Saat Ini
                  </label>
                  <input
                    id="current-password"
                    className="status-select"
                    type="password"
                    name="current_password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />

                  <label className="form-label note-label" htmlFor="new-password">
                    Password Baru
                  </label>
                  <input
                    id="new-password"
                    className="status-select"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />

                  <label className="form-label note-label" htmlFor="confirm-password">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    id="confirm-password"
                    className="status-select"
                    type="password"
                    name="password_confirmation"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />

                  <p
                    className={`form-message${passwordIsError ? ' is-error' : ''}`}
                    role="status"
                    aria-live="polite"
                  >
                    {passwordMessage}
                  </p>

                  <button className="save-button" type="submit" disabled={passwordPending}>
                    {passwordPending ? 'Memperbarui…' : 'Perbarui Password'}
                  </button>
                  <p className="update-footnote">
                    Password baru minimal 8 karakter. Perangkat lain akan keluar, sesi ini tetap
                    aktif.
                  </p>
                </form>
              </section>
            </div>

            <aside className="update-card" aria-labelledby="settings-tips-title">
              <h2 id="settings-tips-title">Tips Keamanan</h2>
              <p className="update-description">
                Gunakan email aktif dan password yang tidak dipakai di layanan lain.
              </p>
              <ul className="settings-tips">
                <li>Perbarui password secara berkala.</li>
                <li>Jangan bagikan token atau password Anda.</li>
                <li>Semua perubahan disimpan langsung ke server.</li>
              </ul>
            </aside>
          </div>
        )}
      </main>
    </OwnerShell>
  );
}
