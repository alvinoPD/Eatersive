import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserHeader from '../../components/user/UserHeader';
import { getApiErrorMessage } from '../../api/client';
import { fetchOrderDetail, type Order } from '../../api/orders';
import { useCatalog } from '../../lib/catalog-store';
import { formatCurrency, readConfirmationOrder } from '../../lib/checkout';
import {
  chargeOrderPayment,
  loadSnapScript,
  payWithSnap,
  refreshOrderPaymentStatus,
} from '../../lib/payments';
import '../../styles/konfirmasi-pesanan.css';

function formatUpperDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('id-ID', options).format(date).toUpperCase();
}

/** Label status pembayaran untuk UI. */
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu Pembayaran',
  paid: 'Pembayaran Lunas',
  expired: 'Pembayaran Kadaluarsa',
  failed: 'Pembayaran Gagal',
  refunded: 'Pembayaran Dikembalikan',
};

export default function KonfirmasiPesananPage() {
  const navigate = useNavigate();
  const { services } = useCatalog();
  const [order] = useState(() => readConfirmationOrder());
  const [message, setMessage] = useState('');
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [paying, setPaying] = useState(false);
  const [payMessage, setPayMessage] = useState('');
  /* muat ulang status pembayaran ke backend (dipakai polling & callback Snap). */
  const syncLocked = useRef(false);

  const orderDbId = order?.orderIds?.[0];
  const paymentStatus = orderDetail?.pembayaran?.status_pembayaran ?? 'pending';
  const payable = paymentStatus === 'pending';

  useEffect(() => {
    document.title = 'Konfirmasi Pesanan — EaterSive';
  }, []);

  /* Muat status pesanan terbaru dari backend saat halaman dibuka. */
  useEffect(() => {
    if (orderDbId === undefined) return;

    fetchOrderDetail(orderDbId)
      .then((detail) => setOrderDetail(detail))
      .catch((error: unknown) => setPayMessage(getApiErrorMessage(error)));
  }, [orderDbId]);

  /* Polling status pembayaran (jalur utama di local) hanya selama masih pending. */
  useEffect(() => {
    if (orderDbId === undefined || !payable) return;

    const poll = window.setInterval(() => {
      if (syncLocked.current) return;
      syncLocked.current = true;

      void refreshOrderPaymentStatus<Order>(orderDbId)
        .then((updated) => setOrderDetail(updated))
        .catch(() => undefined)
        .finally(() => {
          syncLocked.current = false;
        });
    }, 6000);

    return () => window.clearInterval(poll);
  }, [orderDbId, payable, paymentStatus]);

  const serviceById = Object.fromEntries(services.map((service) => [service.id, service]));

  const orderItems = order
    ? Object.entries(order.items).flatMap(([id, quantity]) => {
        const service = serviceById[id];
        return service ? [{ service, quantity }] : [];
      })
    : [];
  const total = order?.total ?? orderItems.reduce(
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

    const orderId = order.orderIds?.[0];

    if (!orderId) {
      setMessage('Pesanan tersimpan, tetapi tautan pelacakan belum tersedia. Buka Pesanan Saya.');
      return;
    }

    navigate(`/lacak-pesanan?order=${orderId}`);
  }

  /* Minta snap_token → buka popup Midtrans. Status akhir disinkron via polling/callback. */
  async function handlePay() {
    if (!order?.groupCode) {
      setPayMessage('Kode grup pembayaran tidak tersedia. Muat ulang halaman atau booking ulang.');
      return;
    }

    setPaying(true);
    setPayMessage('');

    try {
      const charge = await chargeOrderPayment(order.groupCode);
      await loadSnapScript(charge.client_key, charge.is_production);

      payWithSnap(charge.snap_token, {
        onSuccess: () => {
          setPayMessage('Pembayaran berhasil. Status pesanan terbarui.');
          void syncPaymentStatus();
        },
        onPending: () => void syncPaymentStatus(),
        onError: () => void syncPaymentStatus(),
        onClose: () => void syncPaymentStatus(),
      });
    } catch (error) {
      setPayMessage(getApiErrorMessage(error));
    } finally {
      setPaying(false);
    }
  }

  /* Lihat status terbaru: backend mengecek Midtrans lalu sinkron ke DB. */
  async function syncPaymentStatus() {
    if (orderDbId === undefined) return;

    try {
      const updated = await refreshOrderPaymentStatus<Order>(orderDbId);
      setOrderDetail(updated);
    } catch (error) {
      setPayMessage(getApiErrorMessage(error));
    }
  }

  async function handleShare() {
    if (!order) return;

    const shareData = {
      title: 'Konfirmasi Pesanan EaterSive',            text: `Rincian pesanan ${order.orderId}.`,
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
            {order ? 'Pesanan Berhasil Dibuat!' : 'Rincian Pesanan Tidak Ditemukan'}
          </h1>
          <p className="intro">
            {order
              ? 'Terima kasih. Pesanan Anda sudah tersimpan di server EaterSive dan dapat dipantau kapan saja melalui halaman Pesanan Saya.'
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

          {order && orderDbId !== undefined && (
            <div className="primary-actions pay-actions">
              {payable ? (
                <button
                  className="button pay-button"
                  type="button"
                  onClick={handlePay}
                  disabled={paying}
                >
                  {paying ? 'Menyiapkan pembayaran…' : 'Bayar Sekarang'}{' '}
                  <span aria-hidden="true">▸</span>
                </button>
              ) : (
                <span className="status-pill">
                  {PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus}
                </span>
              )}
              <p className="tracking-message" role="status" aria-live="polite">
                {payMessage}
              </p>
            </div>
          )}

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
              Simpan halaman ini atau buka menu <Link to="/pesanan-saya">Pesanan Saya</Link> untuk
              melihat riwayat dan status pesanan Anda.
            </p>
          )}
        </section>

        <aside className="order-card" aria-labelledby="order-title">
          <div className="order-card-heading">
            <h2 id="order-title">
              <span aria-hidden="true">▣</span> Rincian Pesanan
            </h2>
            <span className="status-pill">
              {order ? (order.status ?? 'Menunggu') : 'Belum ada pesanan'}
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
