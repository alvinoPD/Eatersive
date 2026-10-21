import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page">
      <section className="hero-card">
        <p className="eyebrow">404</p>
        <h1>Halaman tidak ditemukan</h1>
        <p className="lead">Route yang Anda buka tidak terdaftar di React Router.</p>
        <div className="hero-actions">
          <Link className="button button--primary" to="/">
            Kembali ke Home
          </Link>
        </div>
      </section>
    </div>
  );
}
