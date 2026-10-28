import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserHeader from '../../components/user/UserHeader';
import { SERVICES, SERVICE_BY_ID, SERVICE_CATEGORIES } from '../../data/services';
import { formatCurrency } from '../../lib/checkout';
import type { CartItems } from '../../types/eatersive';
import '../../styles/pilih-layanan.css';

type FilterCategory = (typeof SERVICE_CATEGORIES)[number];

export default function PilihLayananPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('Semua');
  const [selected, setSelected] = useState<CartItems>({});
  const summaryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = 'Pilih Layanan — EaterSive';
  }, []);

  const visibleServices = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id');
    return SERVICES.filter((service) => {
      const matchesCategory =
        activeFilter === 'Semua' || service.category === activeFilter;
      return matchesCategory && service.search.includes(normalizedQuery);
    });
  }, [activeFilter, query]);

  const orderItems = useMemo(
    () =>
      Object.entries(selected).map(([id, quantity]) => ({
        service: SERVICE_BY_ID[id],
        quantity,
      })),
    [selected],
  );

  const itemCount = orderItems.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = orderItems.reduce(
    (total, item) => total + item.service.price * item.quantity,
    0,
  );

  function changeQuantity(id: string, difference: number) {
    setSelected((current) => {
      const nextQuantity = (current[id] ?? 0) + difference;
      const next = { ...current };
      if (nextQuantity <= 0) {
        delete next[id];
      } else {
        next[id] = nextQuantity;
      }
      return next;
    });
  }

  function handleCheckout() {
    if (itemCount === 0) return;
    const items = encodeURIComponent(JSON.stringify(selected));
    navigate(`/pembayaran?items=${items}`);
  }

  return (
    <div id="page-pilih-layanan">
      <UserHeader />

      <main className="page-wrap">
        <section className="page-heading">
          <span className="breadcrumb">Pilih Layanan</span>
          <h1>Rawat Sepatu Anda</h1>
          <p>
            Pesan layanan cuci sepatu dengan mudah dan praktis. Kami siap membantu
            <br className="desktop-break" /> merawat sepatu kesayangan Anda agar kembali bersih
            dan nyaman digunakan.
          </p>
        </section>

        <div className="catalog-layout">
          <section className="catalog" aria-label="Katalog layanan">
            <div className="catalog-toolbar">
              <label className="search-box">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
                  <path
                    d="m16 16 4.2 4.2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="search"
                  placeholder="Cari layanan cuci, unyellowing, repaint..."
                  aria-label="Cari layanan"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="filter-tabs" role="group" aria-label="Filter kategori layanan">
                {SERVICE_CATEGORIES.map((category) => {
                  const isActive = activeFilter === category;
                  return (
                    <button
                      key={category}
                      className={`filter-button${isActive ? ' is-active' : ''}`}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveFilter(category)}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
              <button
                className="cart-shortcut"
                type="button"
                aria-label="Lihat ringkasan pesanan"
                onClick={() =>
                  summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 5h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.5L21 8H6.1"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="10" cy="20" r="1.2" fill="currentColor" />
                  <circle cx="18" cy="20" r="1.2" fill="currentColor" />
                </svg>
                <span className={`cart-count${itemCount > 0 ? ' has-items' : ''}`}>
                  {itemCount}
                </span>
              </button>
            </div>

            <div className="catalog-heading">
              <h2>
                {activeFilter} ({visibleServices.length})
              </h2>
              {visibleServices.length === 0 && (
                <p>Tidak ada layanan yang cocok. Coba kata kunci atau kategori lain.</p>
              )}
            </div>

            <div className="service-grid">
              {visibleServices.map((service) => {
                const quantity = selected[service.id] ?? 0;
                return (
                  <article
                    className="service-card"
                    key={service.id}
                    data-category={service.category}
                    data-search={service.search}
                  >
                    <div className="service-image">
                      <img src={service.image} alt={`Layanan ${service.name}`} />
                      <span className="category-badge">{service.category}</span>
                    </div>
                    <div className="service-info">
                      <div className="service-title">
                        <h3>{service.name}</h3>
                        <span className="rating">★ {service.rating}</span>
                      </div>
                      <p>{service.description}</p>
                      <div className="service-meta">
                        <span>◷ &nbsp;{service.estimate}</span>
                        <span>✳ &nbsp;{service.reviewCount} ulasan</span>
                      </div>
                      <div className="service-bottom">
                        <span className="price">
                          <small>Mulai dari</small>
                          <strong>{service.priceLabel}</strong>
                        </span>
                        <button
                          className={`add-button${quantity > 0 ? ' is-selected' : ''}`}
                          type="button"
                          aria-label={
                            quantity > 0
                              ? `${service.name} dipilih, tambah lagi`
                              : `Pilih layanan ${service.name}`
                          }
                          onClick={() => changeQuantity(service.id, 1)}
                        >
                          {quantity > 0 ? '✓' : '＋'}{' '}
                          <span>
                            {quantity > 0
                              ? `Dipilih${quantity > 1 ? ` (${quantity})` : ''}`
                              : 'Pilih'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside
            className="order-column"
            id="order-summary"
            aria-label="Ringkasan pesanan"
            ref={summaryRef}
          >
            <section className="order-card">
              <div className="order-heading">
                <h2>
                  <span aria-hidden="true">♧</span> Ringkasan Pesanan{' '}
                  <span className="order-total-count">
                    {itemCount > 0 ? `(${itemCount})` : ''}
                  </span>
                </h2>
                <p>
                  {itemCount === 0
                    ? 'Belum ada layanan yang dipilih'
                    : `${itemCount} layanan dipilih`}
                </p>
              </div>
              <div className="order-content">
                {itemCount === 0 && (
                  <div className="empty-cart">
                    <span className="empty-cart-icon" aria-hidden="true">
                      ♧
                    </span>
                    <p>Silakan pilih layanan cuci sepatu Anda dari katalog di sebelah kiri.</p>
                  </div>
                )}
                <ul className="order-items" aria-live="polite">
                  {orderItems.map(({ service, quantity }) => (
                    <li className="order-item" key={service.id}>
                      <div>
                        <span className="order-item-name">{service.name}</span>
                        <span className="order-item-price">
                          {formatCurrency(service.price * quantity)}
                        </span>
                      </div>
                      <div className="quantity-control">
                        <button
                          type="button"
                          aria-label={`Kurangi ${service.name}`}
                          onClick={() => changeQuantity(service.id, -1)}
                        >
                          −
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          aria-label={`Tambah ${service.name}`}
                          onClick={() => changeQuantity(service.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {itemCount > 0 && (
                  <div className="order-total">
                    <span>Total estimasi</span>
                    <strong>{formatCurrency(totalPrice)}</strong>
                  </div>
                )}
                <button
                  className="checkout-button"
                  type="button"
                  disabled={itemCount === 0}
                  onClick={handleCheckout}
                >
                  Lanjut ke Pembayaran <span aria-hidden="true">→</span>
                </button>
              </div>
            </section>
            <section className="help-card">
              <h2>Butuh bantuan memilih?</h2>
              <p>
                Konsultasikan kondisi sepatu Anda dengan CS kami untuk mendapatkan rekomendasi
                layanan yang paling tepat.
              </p>
              <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer">
                Chat WhatsApp <span aria-hidden="true">↗</span>
              </a>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
