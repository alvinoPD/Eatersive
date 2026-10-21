export default function AboutPage() {
  return (
    <div className="page">
      <section className="hero-card">
        <p className="eyebrow">Tentang</p>
        <h1>Tentang template ini</h1>
        <p className="lead">
          Template ini menyediakan fondasi bersih untuk membangun aplikasi fullstack. Belum ada
          fitur bisnis, CRUD, atau authentication di dalamnya.
        </p>
      </section>

      <section className="card-grid">
        <article className="card">
          <h2>Backend</h2>
          <ul className="list">
            <li>Laravel 13 dengan REST API</li>
            <li>Route API ber-prefix /api/v1</li>
            <li>CORS untuk origin frontend</li>
            <li>MySQL sebagai database default</li>
          </ul>
        </article>
        <article className="card">
          <h2>Frontend</h2>
          <ul className="list">
            <li>React 19 + TypeScript</li>
            <li>Vite sebagai dev server dan bundler</li>
            <li>React Router DOM untuk navigasi</li>
            <li>Axios client terpusat di src/api/client.ts</li>
          </ul>
        </article>
        <article className="card">
          <h2>Struktur</h2>
          <pre className="tree">{`backend/   # Laravel API
frontend/  # React + Vite
README.md  # Dokumentasi`}</pre>
        </article>
      </section>
    </div>
  );
}
