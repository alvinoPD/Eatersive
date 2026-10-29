import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../../auth/useAuth';
import Brand from '../../components/shared/Brand';
import { ROLE_HOME } from '../../data/demoAccounts';
import {
  LANDING_FAQS,
  LANDING_STEPS,
  LANDING_TESTIMONIALS,
} from '../../data/landingContent';
import '../../styles/landing.css';

const NAV_LINKS = [
  { href: '#layanan', label: 'Layanan' },
  { href: '#cara-kerja', label: 'Cara Kerja' },
  { href: '#ulasan', label: 'Ulasan' },
  { href: '#faq', label: 'Pertanyaan' },
];

const WHATSAPP_URL =
  'https://wa.me/6281234567890?text=Halo%20EaterSive%2C%20saya%20ingin%20bertanya%20tentang%20layanan.';

export default function LandingPage() {
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const location = useLocation();

  useEffect(() => {
    document.title = 'EaterSive — Kembalikan Kilau Sepatu Favorit Anda';
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div id="page-landing">
      <header className="site-header">
        <Brand label="EaterSive, ke beranda" />

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
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={closeMenu}>
              {link.label}
            </a>
          ))}
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

      <main>
        <section className="hero section-wrap" id="beranda">
          <div className="hero-copy">
            <p className="eyebrow">Shoe care, made simple</p>
            <h1>
              Kembalikan Kilau <span>Sepatu Favorit</span> Anda Sekarang.
            </h1>
            <p className="hero-description">
              Layanan cuci, perbaikan, dan restorasi sepatu profesional di Surabaya. Dipercaya
              1.000+ pelanggan.
            </p>
            <Link className="button hero-button" to="/layanan">
              Mulai Cuci Sepatu Sekarang
              <span aria-hidden="true">→</span>
            </Link>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                  alt=""
                />
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80"
                  alt=""
                />
                <img
                  src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=80&q=80"
                  alt=""
                />
              </div>
              <p>
                <strong>1.000+</strong>
                <br />
                sepatu kembali bersih
              </p>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-orbit" />
            <img
              className="hero-image"
              src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1100&q=90"
              alt="Sepatu sneaker yang bersih dan terawat"
            />
            <div className="trust-card">
              <span className="trust-icon" aria-hidden="true">
                ✓
              </span>
              <span>
                <strong>1000+ Pelanggan</strong>
                <small>Puas dengan hasil kami</small>
              </span>
            </div>
            <span className="hero-note">
              Dirawat sepenuh hati <span aria-hidden="true">✳</span>
            </span>
          </div>
        </section>

        <section className="process section-wrap" id="cara-kerja">
          <div className="section-heading">
            <p className="eyebrow">Langkah mudah</p>
            <h2>Cara Kerja EaterSive</h2>
            <p>
              Proses pembersihan yang efisien dan profesional, mulai dari penjemputan hingga
              sepatu kembali ke tangan Anda.
            </p>
          </div>
          <div className="steps">
            {LANDING_STEPS.map((step) => (
              <article className="step" key={step.number}>
                <div className="step-icon" aria-hidden="true">
                  {step.icon}
                </div>
                <span className="step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="services" id="layanan">
          <div className="section-wrap services-inner">
            <div className="services-heading">
              <div>
                <p className="eyebrow eyebrow--light">Layanan kami</p>
                <h2>
                  Pilihan Perawatan Terbaik <span className="tag">Terpopuler</span>
                </h2>
              </div>
              <Link className="button button--light" to="/layanan">
                Lihat Semua Layanan <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="service-grid">
              <Link className="service-card" to="/layanan">
                <img
                  src="https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=700&q=85"
                  alt="Sneaker putih setelah basic cleaning"
                />
                <span className="service-card-copy">
                  <strong>Basic Cleaning</strong>
                  <small>Untuk cuci luar dan dalam</small>
                </span>
              </Link>
              <Link className="service-card" to="/layanan">
                <img
                  src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=700&q=85"
                  alt="Sepatu setelah hard cleaning"
                />
                <span className="service-card-copy">
                  <strong>Hard Cleaning</strong>
                  <small>Untuk sepatu yang sudah dibersihkan</small>
                </span>
              </Link>
              <Link className="service-card" to="/layanan">
                <img
                  src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85"
                  alt="Perawatan khusus suede"
                />
                <span className="service-card-copy">
                  <strong>Suede Cleaning</strong>
                  <small>Treatment khusus sepatu kamu</small>
                </span>
              </Link>
              <Link className="service-card service-card--wide" to="/layanan">
                <img
                  src="https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1200&q=85"
                  alt="Perawatan dan restorasi sneaker"
                />
                <span className="wide-overlay" />
                <span className="wide-copy">
                  <small>Additional care</small>
                  <strong>
                    Whitening
                    <br />
                    Leather
                    <br />
                    Unyellowing
                  </strong>
                </span>
                <span className="wide-label">AFTER REPAIR</span>
              </Link>
              <Link className="promo-card promo-card--repair" to="/layanan">
                <span className="promo-content">
                  <small>More treatment</small>
                  <strong>
                    Repaint
                    <br />
                    Reglue
                    <br />
                    Other
                  </strong>
                  <span>Sepatu kesayanganmu bisa kembali seperti baru.</span>
                  <b>
                    Shop now <span aria-hidden="true">→</span>
                  </b>
                </span>
                <img
                  src="https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=900&q=85"
                  alt="Sepatu sneaker untuk layanan repaint dan reglue"
                />
              </Link>
              <Link className="promo-card promo-card--gear" to="/layanan">
                <span className="promo-content">
                  <small>Shoe &amp; gear cleaner service</small>
                  <strong>
                    Beyond
                    <br />
                    Sneakers
                  </strong>
                  <span>
                    Helm · Bag · Hat · Cap
                    <br />
                    Any Shoe
                  </span>
                </span>
                <img
                  src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85"
                  alt="Tas dan perlengkapan yang dapat dirawat"
                />
              </Link>
              <Link className="promo-card promo-card--delivery" to="/layanan">
                <span className="promo-content">
                  <small>Anywhere anytime</small>
                  <strong>
                    Delivery To
                    <br />
                    Your Place
                  </strong>
                  <span>Delivery services</span>
                </span>
                <span className="delivery-art" aria-hidden="true">
                  🚚
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="testimonials section-wrap" id="ulasan">
          <div className="section-heading">
            <p className="eyebrow">Apa kata mereka?</p>
            <h2>Testimoni Pelanggan</h2>
          </div>
          <div className="testimonial-grid">
            {LANDING_TESTIMONIALS.map((testimonial) => (
              <article className="testimonial" key={testimonial.name}>
                <div className="stars" aria-label="5 dari 5 bintang">
                  ★★★★★
                </div>
                <blockquote>{testimonial.quote}</blockquote>
                <div className="customer">
                  <img src={testimonial.avatar} alt="" />
                  <span>
                    <strong>{testimonial.name}</strong>
                    <small>{testimonial.role}</small>
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="cta-banner" id="kontak">
            <h2>Sudah siap belum?</h2>
            <a
              className="button button--light"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
            >
              Ayo Siappp <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section className="faq section-wrap" id="faq">
          <div className="faq-intro">
            <p className="eyebrow">Pertanyaan umum</p>
            <h2>Masih Ada Pertanyaan?</h2>
            <p>
              Yuk, temukan jawaban untuk beberapa pertanyaan yang paling sering ditanyakan oleh
              pelanggan kami untuk memudahkan Anda.
            </p>
            <div className="support-card">
              <span className="support-icon" aria-hidden="true">
                ?
              </span>
              <strong>Hubungi dukungan kami</strong>
              <p>
                Customer service kami siap membantu Anda 24/7 jika ada kendala maupun pertanyaan
                di sini.
              </p>
              <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer">
                Chat di WhatsApp <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
          <div className="faq-list">
            {LANDING_FAQS.map((faq, index) => (
              <details
                className="faq-item"
                key={faq.question}
                open={openFaq === index}
                onToggle={(event) => {
                  if (event.currentTarget.open) setOpenFaq(index);
                  else setOpenFaq((current) => (current === index ? null : current));
                }}
              >
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer" id="footer">
        <div className="footer-main section-wrap">
          <div className="footer-about">
            <Brand label="EaterSive, ke beranda" variant="spark" />
            <p>
              Platform layanan cuci sepatu profesional terpercaya di Surabaya. Kami hadir untuk
              menjaga koleksi sepatu Anda tetap terlihat seperti baru.
            </p>
          </div>
          <div className="footer-column">
            <h2>Navigasi</h2>
            <a href="#layanan">Layanan</a>
            <a href="#cara-kerja">Cara Kerja</a>
            <a href="#ulasan">Testimoni</a>
            <a href="#faq">Pertanyaan</a>
          </div>
          <div className="footer-column">
            <h2>Bantuan &amp; Kebijakan</h2>
            <a href="#faq">Syarat &amp; Ketentuan</a>
            <a href="#faq">Kebijakan Privasi</a>
            <a href="#kontak">Pusat Bantuan</a>
            <Link to="/about">Tentang Kami</Link>
          </div>
          <div className="footer-column footer-contact">
            <h2>Hubungi Kami</h2>
            <p>
              ⌖ Jl. Gajah Mada Baru No. 135,
              <br />
              Wonokromo, Surabaya
            </p>
            <a href="tel:+62895605470719">⌕ +62 895 6054 70719</a>
            <a href="mailto:halo@eatersive.id">✉ halo@eatersive.id</a>
            <div className="social-links" aria-label="Media sosial">
              <a href="#footer" aria-label="Instagram">
                ◎
              </a>
              <a href="#footer" aria-label="Facebook">
                f
              </a>
              <a href="#footer" aria-label="TikTok">
                ♪
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom section-wrap">
          <p>© {new Date().getFullYear()} EaterSive Indonesia. Seluruh hak cipta dilindungi.</p>
          <div>
            <a href="#footer">Privasi</a>
            <a href="#footer">Sitemap</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
