import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import UserHeader from '../../components/user/UserHeader';
import ImageCarousel from '../../components/shared/ImageCarousel';
import { getApiErrorMessage } from '../../api/client';
import {
  fetchMyOrders,
  fetchOrderDetail,
  formatOrderDateTime,
  paymentMethodLabel,
  PAYMENT_STATUS_LABELS,
  type Order,
} from '../../api/orders';
import { formatCurrency } from '../../lib/checkout';
import '../../styles/konfirmasi-pesanan.css';

function formatUpperDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('id-ID', options).format(date).toUpperCase();
}

export default function KonfirmasiPesananPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const [order, setOrder] = useState<Order | null>(null);
  const [groupOrders, setGroupOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState(orderId ? '' : 'Nomor pesanan belum tersedia.');
  const [message, setMessage] = useState('');
  const [photoWarning] = useState(() => {
    const warning = window.sessionStorage.getItem('eatersive-checkout-warning');
    window.sessionStorage.removeItem('eatersive-checkout-warning');
    return warning ?? '';
  });

  useEffect(() => {
    document.title = 'Konfirmasi Pesanan — EaterSive';
  }, []);

  useEffect(() => {
    if (!orderId) return;

    let alive = true;

    Promise.all([fetchOrderDetail(orderId), fetchMyOrders()])
      .then(([detail, mine]) => {
        if (!alive) return;
        setOrder(detail);
        setGroupOrders(
          detail.kode_grup
            ? mine.filter((item) => item.kode_grup === detail.kode_grup)
            : [detail],
        );
        setError('');
      })
      .catch((fetchError) => {
        if (alive) setError(getApiErrorMessage(fetchError));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [orderId]);

  const items = groupOrders.length > 0 ? groupOrders : order ? [order] : [];

  const totals = items.reduce(
    (sum, item) => ({
      subtotal: sum.subtotal + item.subtotal,
      discount: sum.discount + item.diskon,
      total: sum.total + item.total_harga,
    }),
    { subtotal: 0, discount: 0, total: 0 },
  );

  const photos = (order?.photos ?? []).map((photo) => ({
    src: photo.url,
    alt: `Foto sepatu sisi ${photo.sisi}`,
    caption: photo.sisi,
  }));

  const createdAt = order ? new Date(order.created_at) : null;
  const completionDate = order?.estimasi_selesai
    ? new Date(`${order.estimasi_selesai}T00:00:00`)
    : createdAt
      ? new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000)
      : null;

  async function handleShare() {
    if (!order) return;

    const shareData = {
      title: 'Konfirmasi Pesanan EaterSive',
      text: `Rincian pesanan ${order.kode_pesanan ?? `#${order.id}`}.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      setMessage('Tautan konfirmasi berhasil disalin.');
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setMessage('Konfirmasi tidak dapat dibagikan. Silakan coba lagi.');
      console.error('Tidak dapat membagikan konfirmasi:', shareError);
    }
  }

  if (loading) {
    return (
      <div id="page-konfirmasi">
        <UserHeader />
        <main className="confirmation-layout">
          <section className="confirmation-main">
            <p className="empty-order" role="status">
              Memuat rincian pesanan…
            </p>
          </section>
        </main>
      </div>
    );
  }

  if (!order || error) {
    return (
      <div id="page-konfirmasi">
        <UserHeader />
        <main className="confirmation-layout">
          <section className="confirmation-main">
            <h1 id="confirmation-title">Rincian Pesanan Tidak Ditemukan</h1>
            <p className="intro">{error}</p>
            <div className="primary-actions">
              <Link className="button button--outline" to="/pesanan-saya">
                Lihat Pesanan Saya
              </Link>
              <Link className="button" to="/layanan">
                Pesan Layanan Lagi
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div id="page-konfirmasi">
      <UserHeader />

      <main className="confirmation-layout">
        <section className="confirmation-main">
          <div className="success-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.3" />
              <path
                d="m10 16.2 4 4 8-8.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 id="confirmation-title">Pesanan Berhasil Dibuat!</h1>
          <p className="intro">
            Pesanan Anda sudah tersimpan di server dan diteruskan ke dashboard owner. Simpan
            nomor pesanan <strong>{order.kode_pesanan ?? `#${order.id}`}</strong> untuk melacak.
          </p>

          {photoWarning && (
            <p className="tracking-message is-error" role="alert">
              {photoWarning}
            </p>
          )}

          {photos.length > 0 && (
            <section className="confirmation-photos" aria-labelledby="photos-title">
              <h2 id="photos-title">Foto Sepatu Yang Diunggah</h2>
              <ImageCarousel
                images={photos}
                className="order-photo-carousel"
                ariaLabel="Foto sepatu pelanggan"
              />
            </section>
          )}

          <section className="next-steps" aria-labelledby="steps-title">
            <div className="steps-copy">
              <span className="estimate">
                Estimasi Selesai:{' '}
                <strong>
                  {completionDate
                    ? formatUpperDate(completionDate, {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </strong>
              </span>
              <h2 id="steps-title">Langkah Selanjutnya:</h2>
              <ol>
                <li>
                  <span>1</span>
                  <p>Siapkan sepatu Anda dalam wadah/kantong yang rapi.</p>
                </li>
                <li>
                  <span>2</span>
                  <p>Tunggu kurir EaterSive menghubungi Anda di nomor terdaftar.</p>
                </li>
              </ol>
            </div>
            <div className="abstract-art" role="img" aria-label="Ilustrasi abstrak berwarna pastel">
              <span className="art-ring" />
              <span className="art-orb art-orb--blue" />
              <span className="art-orb art-orb--peach" />
              <span className="art-orb art-orb--pink" />
              <span className="art-orb art-orb--violet" />
            </div>
          </section>

          <div className="primary-actions">
            <Link className="button track-button" to={`/lacak-pesanan?order=${order.id}`}>
              Lacak Status Pesanan <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button--outline" to="/pesanan-saya">
              Lihat Pesanan Saya
            </Link>
            <Link className="button button--outline" to={`/nota/${order.id}`}>
              Cetak Nota
            </Link>
          </div>
          <p className="tracking-message" role="status" aria-live="polite">
            {message}
          </p>

          <section className="support-card">
            <span className="support-icon" aria-hidden="true">
              ◷
            </span>
            <div>
              <h2>Butuh Bantuan Mendadak?</h2>
              <p>Hubungi CS kami via WhatsApp (08:00 - 20:00 WIB)</p>
            </div>
            <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer">
              Chat Sekarang
            </a>
          </section>
        </section>

        <aside className="order-card" aria-labelledby="order-title">
          <div className="order-card-heading">
            <h2 id="order-title">
              <span aria-hidden="true">▣</span> Rincian Pesanan
            </h2>
            <span className={`status-pill status--${order.status}`}>{order.status_label}</span>
          </div>
          <div className="order-card-body">
            <div className="order-meta">
              <div>
                <span>ID Pesanan</span>
                <strong>{order.kode_pesanan ?? `#${order.id}`}</strong>
              </div>
              <div className="order-date">
                <span>Tanggal</span>
                <strong>{formatOrderDateTime(order.created_at)} WIB</strong>
              </div>
            </div>
            <div className="order-details">
              <div className="detail-row">
                <span className="detail-icon" aria-hidden="true">
                  ⌖
                </span>
                <div>
                  <span>Alamat Penjemputan</span>
                  <strong>
                    {[order.alamat, order.nama].filter(Boolean).join(' · ') || '—'}
                  </strong>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-icon" aria-hidden="true">
                  ▱
                </span>
                <div>
                  <span>Metode Pembayaran</span>
                  <strong>{paymentMethodLabel(order.pembayaran?.metode_pembayaran)}</strong>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-icon" aria-hidden="true">
                  ◎
                </span>
                <div>
                  <span>Status Pembayaran</span>
                  <strong>
                    {PAYMENT_STATUS_LABELS[order.pembayaran?.status_pembayaran ?? ''] ??
                      'Belum dibayar'}
                  </strong>
                </div>
              </div>
            </div>
            <div className="items-section">
              <h3>Item &amp; Layanan</h3>
              {items.length > 0 ? (
                <ul className="confirmed-items">
                  {items.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.layanan?.nama ?? 'Layanan'}
                        {item.jumlah > 1 ? ` × ${item.jumlah}` : ''}
                      </span>
                      <strong>{formatCurrency(item.subtotal)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-items-message">
                  Belum ada rincian pesanan. <Link to="/layanan">Pilih layanan</Link>.
                </p>
              )}
            </div>

            <div className="summary-breakdown">
              <div>
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="is-discount">
                  <span>Diskon member</span>
                  <span>−{formatCurrency(totals.discount)}</span>
                </div>
              )}
            </div>

            <div className="confirmed-total">
              <strong>Total Bayar</strong>
              <strong>{formatCurrency(totals.total)}</strong>
            </div>
          </div>
          <div className="order-card-actions">
            <Link to={`/nota/${order.id}`}>
              <span aria-hidden="true">♧</span> Cetak Nota
            </Link>
            <span className="action-divider" />
            <button type="button" onClick={handleShare}>
              <span aria-hidden="true">⌯</span> Bagikan
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
