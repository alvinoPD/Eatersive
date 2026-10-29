import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserHeader from '../../components/user/UserHeader';
import { useCatalog } from '../../lib/catalog-store';
import { formatCurrency, readConfirmationOrder } from '../../lib/checkout';
import '../../styles/konfirmasi-pesanan.css';

function formatUpperDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('id-ID', options).format(date).toUpperCase();
}

export default function KonfirmasiPesananPage() {
  const navigate = useNavigate();
  const { services } = useCatalog();
  const [order] = useState(() => readConfirmationOrder());
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.title = 'Konfirmasi Pesanan — EaterSive';
  }, []);

  const serviceById = Object.fromEntries(services.map((service) => [service.id, service]));

  const orderItems = order
    ? Object.entries(order.items).flatMap(([id, quantity]) => {
        const service = serviceById[id];
        return service ? [{ service, quantity }] : [];
      })
    : [];
  const total = orderItems.reduce(
    (sum, item) => sum + item.service.price * item.quantity,
    0,
  );

  const createdAt = order ? new Date(order.createdAt) : null;
  const completionDate = createdAt ? new Date(createdAt) : null;
  completionDate?.setDate(completionDate.getDate() + 3);

  const addressParts = order
    ? [order.address.address, order.address.recipient]
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  function handleTrack() {
    if (!order) {
      setMessage('Pilih layanan terlebih dahulu untuk melihat status pesanan.');
      return;
    }
    navigate('/lacak-pesanan');
  }

  async function handleShare() {
    if (!order) return;

    const shareData = {
      title: 'Konfirmasi Pesanan EaterSive',
      text: `Rincian pesanan demo ${order.orderId}.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      setMessage('Tautan konfirmasi berhasil disalin.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage('Konfirmasi tidak dapat dibagikan. Silakan coba lagi.');
      console.error('Tidak dapat membagikan konfirmasi:', error);
    }
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
          <h1 id="confirmation-title">
            {order ? 'Pesanan Demo Berhasil Disiapkan!' : 'Rincian Pesanan Tidak Ditemukan'}
          </h1>
          <p className="intro">
            {order
              ? 'Terima kasih. Rincian pesanan demo Anda sudah disiapkan di browser ini. Belum ada pesanan yang dikirim ke server.'
              : 'Halaman ini belum menerima data pesanan. Silakan pilih layanan dan lanjutkan proses checkout.'}
          </p>

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
                  <p>Tunggu kurir SoleCare menghubungi Anda di nomor terdaftar.</p>
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
            <button
              className="button track-button"
              type="button"
              onClick={handleTrack}
              disabled={!order}
            >
              Lacak Status Pesanan <span aria-hidden="true">→</span>
            </button>
            <Link className="button button--outline" to="/layanan">
              Pesan Layanan Lagi
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
          {order && (
            <p className="demo-note">
              Konfirmasi ini hanya demo. Booking belum dikirim atau disimpan di server.
            </p>
          )}
        </section>

        <aside className="order-card" aria-labelledby="order-title">
          <div className="order-card-heading">
            <h2 id="order-title">
              <span aria-hidden="true">▣</span> Rincian Pesanan
            </h2>
            <span className="status-pill">
              {order ? 'Menunggu Penjemputan' : 'Belum ada pesanan'}
            </span>
          </div>
          <div className="order-card-body">
            <div className="order-meta">
              <div>
                <span>ID Pesanan</span>
                <strong>{order?.orderId ?? '—'}</strong>
              </div>
              <div className="order-date">
                <span>Tanggal</span>
                <strong>
                  {createdAt
                    ? `${formatUpperDate(createdAt, {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Jakarta',
                      })} WIB`
                    : '—'}
                </strong>
              </div>
            </div>
            <div className="order-details">
              <div className="detail-row">
                <span className="detail-icon" aria-hidden="true">
                  ⌖
                </span>
                <div>
                  <span>Alamat Penjemputan</span>
                  <strong>{addressParts.join(' · ') || '—'}</strong>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-icon" aria-hidden="true">
                  ▱
                </span>
                <div>
                  <span>Metode Pembayaran</span>
                  <strong>{order?.paymentMethod ?? '—'}</strong>
                </div>
              </div>
            </div>
            <div className="items-section">
              <h3>Item &amp; Layanan</h3>
              {orderItems.length > 0 ? (
                <ul className="confirmed-items">
                  {orderItems.map(({ service, quantity }) => (
                    <li key={service.id}>
                      <span>
                        {service.name} ×{quantity}
                      </span>
                      <strong>{formatCurrency(service.price * quantity)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-items-message">
                  Belum ada rincian pesanan. <Link to="/layanan">Pilih layanan</Link>.
                </p>
              )}
            </div>
            <div className="confirmed-total">
              <strong>Total Bayar</strong>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
          <div className="order-card-actions">
            <button type="button" onClick={() => window.print()} disabled={!order}>
              <span aria-hidden="true">♧</span> Simpan Struk
            </button>
            <span className="action-divider" />
            <button type="button" onClick={handleShare} disabled={!order}>
              <span aria-hidden="true">⌯</span> Bagikan
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
