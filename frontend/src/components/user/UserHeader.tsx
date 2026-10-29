import { Link } from 'react-router-dom';
import useAuth from '../../auth/useAuth';
import { ROLE_HOME } from '../../data/demoAccounts';
import Brand from '../shared/Brand';

/**
 * Header bersama untuk halaman alur pemesanan (pilih layanan, pembayaran,
 * konfirmasi, pelacakan, login tidak memakai header ini).
 */
export default function UserHeader() {
  const { session, logout } = useAuth();

  return (
    <header className="site-header">
      <Brand label="EaterSive, beranda" />

      <nav className="main-nav" aria-label="Navigasi utama">
        <Link to="/layanan">Layanan</Link>
        <Link to="/#cara-kerja">Cara Kerja</Link>
        <Link to="/#ulasan">Ulasan</Link>
        <Link to="/#faq">Pertanyaan</Link>
      </nav>

      <div className="header-actions">
        {session ? (
          <>
            <Link className="login-link" to={ROLE_HOME[session.role]}>
              {session.name}
            </Link>
            <Link className="button button--small" to="/login" onClick={logout}>
              Keluar
            </Link>
          </>
        ) : (
          <>
            <Link className="login-link" to="/login">
              Masuk
            </Link>
            <Link className="button button--small" to="/login">
              Daftar
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
