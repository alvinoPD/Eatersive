import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api/client';

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero-card">
        <p className="eyebrow">Starter Template</p>
        <h1>Laravel API + React TypeScript</h1>
        <p className="lead">
          Template dasar fullstack dengan backend Laravel (REST API) dan frontend React + Vite
          sebagai dua aplikasi terpisah. Halaman ini dirender oleh React Router, sedangkan data
          diambil dari Laravel melalui Axios.
        </p>
        <div className="hero-actions">
          <Link className="button button--primary" to="/api-status">
            Cek Status API
          </Link>
          <Link className="button" to="/about">
            Tentang Template
          </Link>
        </div>
      </section>

      <section className="card-grid">
        <article className="card">
          <h2>Backend</h2>
          <p>Laravel REST API dengan routing ber-prefix versi.</p>
          <p className="mono">{API_BASE_URL}</p>
        </article>
        <article className="card">
          <h2>Frontend</h2>
          <p>React, TypeScript, Vite, React Router DOM, dan Axios.</p>
          <p className="mono">http://localhost:5173</p>
        </article>
        <article className="card">
          <h2>Health Check</h2>
          <p>Endpoint ringan untuk memastikan frontend terhubung ke backend.</p>
          <p className="mono">GET /api/v1/health</p>
        </article>
      </section>
    </div>
  );
}
