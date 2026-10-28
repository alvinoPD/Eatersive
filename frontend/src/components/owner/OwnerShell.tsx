import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../auth/useAuth';
import Brand from '../shared/Brand';

export type OwnerNavKey = 'dashboard' | 'orders' | 'catalog' | 'reviews';

interface OwnerShellProps {
  pageId: string;
  shellClassName: string;
  activeNav: OwnerNavKey;
  children: ReactNode;
  footer?: ReactNode;
}

const NAV_ITEMS: Array<{ key: OwnerNavKey; label: string; to: string; icon: ReactNode }> = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: '/owner',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    key: 'orders',
    label: 'Pesanan',
    to: '/owner/orders',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="M9 4.5h6M9 9h6M9 13h6m-6 3h4" />
      </svg>
    ),
  },
  {
    key: 'catalog',
    label: 'Kelola Katalog',
    to: '/owner/catalog',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m20 13-7 7-10-10V4h6l11 9Z" />
        <circle cx="7.5" cy="7.5" r="1" />
      </svg>
    ),
  },
  {
    key: 'reviews',
    label: 'Review Pelanggan',
    to: '/owner/reviews',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-6 3V7a2 2 0 0 1 2-2Z" />
      </svg>
    ),
  },
];

const SETTINGS_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" />
  </svg>
);

const LOGOUT_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m5-4 4-4-4-4m4 4H9" />
  </svg>
);

/**
 * Kerangka dashboard owner: sidebar, topbar mobile, dan area konten.
 * Class CSS tetap mengikuti desain contoh agar setiap halaman tampil sama.
 */
export default function OwnerShell({
  pageId,
  shellClassName,
  activeNav,
  children,
  footer,
}: OwnerShellProps) {
  const { session, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div id={pageId}>
      <div className={shellClassName}>
        <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`} id="sidebar">
          <p className="sidebar-label">Manajemen</p>
          <nav className="sidebar-nav" aria-label="Navigasi manajemen">
            {NAV_ITEMS.map((item) => {
              const isActive = item.key === activeNav;
              return (
                <Link
                  key={item.key}
                  className={`nav-link${isActive ? ' is-active' : ''}`}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="nav-chevron" aria-hidden="true">
                      ›
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            <a className="nav-link" href="#pengaturan">
              {SETTINGS_ICON}
              <span>Pengaturan</span>
            </a>
            <Link
              className="nav-link nav-link--logout"
              to="/login"
              onClick={() => {
                logout();
                setSidebarOpen(false);
              }}
            >
              {LOGOUT_ICON}
              <span>Keluar</span>
            </Link>
          </div>
        </aside>

        <div className="workspace">
          <header className="topbar">
            <button
              className="menu-toggle"
              type="button"
              aria-expanded={sidebarOpen}
              aria-controls="sidebar"
              aria-label={sidebarOpen ? 'Tutup navigasi' : 'Buka navigasi'}
              onClick={() => setSidebarOpen((isOpen) => !isOpen)}
            >
              <span />
              <span />
              <span />
            </button>
            <Brand to="/owner" label="EaterSive, ke dashboard" />
            <button
              className="profile-button"
              type="button"
              aria-label={`Profil ${session?.name ?? 'pemilik'}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
              </svg>
            </button>
          </header>

          {children}

          {footer}
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="sidebar-scrim"
          id="sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/** Footer dashboard owner. Status dibuat netral karena data masih demo lokal. */
export function OwnerFooter() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} EaterSive Admin v2.1.0 • Data demo lokal</p>
      <div>
        <span className="connection">
          <i /> Data lokal
        </span>
        <span className="health">
          <i /> Mode demo
        </span>
      </div>
    </footer>
  );
}
