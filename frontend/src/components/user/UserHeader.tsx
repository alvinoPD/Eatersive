import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../auth/useAuth';
import { ROLE_HOME } from '../../auth/roles';
import Brand from '../shared/Brand';

/**
 * Header bersama untuk halaman alur pemesanan (pilih layanan, pembayaran,
 * konfirmasi, pelacakan, login tidak memakai header ini).
 */
export default function UserHeader() {
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <Brand label="EaterSive, beranda" />

      <button
        className="menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="main-nav"
        aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav
        className={`main-nav${menuOpen ? ' is-open' : ''}`}
        id="main-nav"
        aria-label="Navigasi utama"
      >
        <Link to="/layanan" onClick={closeMenu}>
          Layanan
        </Link>
        <Link to="/#cara-kerja" onClick={closeMenu}>
          Cara Kerja
        </Link>
        <Link to="/#ulasan" onClick={closeMenu}>
          Ulasan
        </Link>
        <Link to="/#faq" onClick={closeMenu}>
          Pertanyaan
        </Link>
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
