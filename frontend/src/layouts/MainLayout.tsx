import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About', end: false },
  { to: '/api-status', label: 'API Status', end: false },
];

/**
 * Layout utama frontend: header + navigasi React Router + konten halaman.
 */
export default function MainLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="app-brand">
          Laravel <span>+</span> React
        </NavLink>

        <nav className="app-nav" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'app-nav__link is-active' : 'app-nav__link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <p>Starter template Laravel API + React TypeScript (Vite).</p>
      </footer>
    </div>
  );
}
