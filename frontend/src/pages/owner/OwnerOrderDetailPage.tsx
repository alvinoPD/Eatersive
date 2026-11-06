import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import OwnerShell from '../../components/owner/OwnerShell';
import { getApiErrorMessage } from '../../api/client';
import {
  fetchOrderDetail,
  formatOrderDateTime,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from '../../api/orders';
import { formatCurrency } from '../../lib/checkout';
import '../../styles/owner-order-detail.css';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  processing: 'Sedang Dikerjakan',
  quality_check: 'Pengecekan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['quality_check', 'cancelled'],
  quality_check: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export default function OwnerOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState(orderId ? '' : 'ID pesanan tidak valid.');

  useEffect(() => {
    document.title = 'Detail Pesanan — EaterSive';
  }, []);

  useEffect(() => {
    if (!orderId) return;

    let alive = true;

    fetchOrderDetail(orderId)
      .then((detail) => {
        if (!alive) return;
        setOrder(detail);
        setError('');
      })
      .catch((fetchError) => {
        if (!alive) return;
        setOrder(null);
        setError(getApiErrorMessage(fetchError));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [orderId]);

  return (
    <OwnerShell
      pageId="page-owner-order-detail"
      shellClassName="detail-shell"
      activeNav="orders"
    >
      <main className="detail-content">
        <Link className="back-link" to="/owner/orders">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14 5-7 7 7 7M7 12h14" />
          </svg>
          Kembali
        </Link>

        <section className="page-heading" aria-labelledby="page-title">
          <h1 id="page-title">Detail Pesanan</h1>
          <p>
            ID Pesanan: <strong>{order?.kode_pesanan ?? orderId ?? '—'}</strong>
            {order && (
              <>
                <span className="heading-dot">•</span>Dibuat pada{' '}
                <time dateTime={order.created_at}>{formatOrderDateTime(order.created_at)}</time>
              </>
            )}
          </p>
        </section>

        {loading && (
          <p className="empty-state" role="status">
            Memuat detail pesanan…
          </p>
        )}

        {!loading && error && (
          <p className="empty-state" role="alert">
            {error} <Link to="/owner/orders">Lihat daftar pesanan</Link>.
          </p>
        )}

        {!loading && order && (
          <OrderDetailView order={order} onUpdated={setOrder} />
        )}
      </main>
    </OwnerShell>
  );
}

function OrderDetailView({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated: (order: Order) => void;
}) {
  const nextStatuses = NEXT_STATUSES[order.status];
  const [status, setStatus] = useState<OrderStatus | ''>(nextStatuses[0] ?? '');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  const phoneDigits = (order.nomor_telp ?? '').replace(/\D/g, '');
  const timeline = order.timeline ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status || pending) return;

    setPending(true);
    setMessage('');

    try {
      const updated = await updateOrderStatus(order.id, status, note);
      onUpdated(updated);
      setNote('');
      setStatus(NEXT_STATUSES[updated.status][0] ?? '');
      setMessageIsError(false);
      setMessage('Status pesanan berhasil diperbarui dan tersimpan di server.');
    } catch (updateError) {
      setMessageIsError(true);
      setMessage(getApiErrorMessage(updateError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="detail-layout">
      <div className="detail-main">
        <div className="information-grid">
          <section className="info-card" aria-labelledby="customer-title">
            <h2 className="section-title" id="customer-title">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3" />
                <path d="M6 20v-1.5a6 6 0 0 1 12 0V20" />
              </svg>
              Informasi Pelanggan
            </h2>
            <div className="customer-profile">
              <div>
                <strong>{order.nama}</strong>
                {order.nomor_telp ? (
                  <a href={`tel:${phoneDigits}`}>{order.nomor_telp}</a>
                ) : (
                  <span>Nomor telepon belum diisi</span>
                )}
              </div>
            </div>
            <div className="info-divider" />
            <p className="field-label">Alamat Penjemputan</p>
            <address>{order.alamat || '—'}</address>
            {order.nomor_telp && (
              <a
                className="contact-button"
                href={`https://wa.me/${phoneDigits}`}
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 5h14v11H9l-4 3V5Z" />
                  <path d="M9 10h6" />
                </svg>
                Hubungi Pelanggan
              </a>
            )}
          </section>

          <section className="info-card service-card" aria-labelledby="service-title">
            <h2 className="section-title" id="service-title">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
                <path d="m4.2 7.6 7.8 4.5 7.8-4.5M12 12v9" />
              </svg>
              Informasi Layanan
            </h2>
            <div className="service-profile">
              <span className="service-image" aria-hidden="true">
                {order.layanan?.kategori?.charAt(0) ?? '▧'}
              </span>
              <div>
                <strong>{order.layanan?.nama ?? 'Layanan'}</strong>
                <span>{order.layanan?.kategori ?? '—'}</span>
              </div>
            </div>
            <div className="service-specs">
              <div>
                <p className="field-label">Jumlah</p>
                <strong>{order.jumlah} unit</strong>
              </div>
              <div>
                <p className="field-label">Estimasi</p>
                <strong>{order.layanan?.estimasi ?? '—'}</strong>
              </div>
            </div>
            <div className="info-divider" />
            <p className="field-label">Catatan Pelanggan</p>
            <p className="condition">{order.catatan || 'Tidak ada catatan.'}</p>
          </section>
        </div>

        <section className="payment-card" aria-labelledby="payment-title">
          <h2 className="section-title" id="payment-title">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Ringkasan Pembayaran
          </h2>
          <div className="payment-row">
            <span>Total Pesanan</span>
            <strong>{formatCurrency(order.total_harga)}</strong>
          </div>
          <div className="payment-row">
            <span>Status Pembayaran</span>
            <strong>{order.pembayaran?.status_pembayaran ?? 'Belum ada'}</strong>
          </div>
          <div className="payment-total">
            <strong>Total Pendapatan</strong>
            <strong>{formatCurrency(order.total_harga)}</strong>
          </div>
          <p className="payment-note">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <path d="m8.5 12 2.3 2.3 4.8-5" />
            </svg>
            Metode pembayaran: {order.pembayaran?.metode_pembayaran ?? '—'}
          </p>
        </section>

        <section className="history-card" aria-labelledby="history-title">
          <h2 className="section-title" id="history-title">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 7v5l3 2M4 5v4h4" />
            </svg>
            Histori Pengerjaan
          </h2>

          {timeline.length === 0 ? (
            <p className="empty-state">Belum ada riwayat status.</p>
          ) : (
            <ol className="timeline">
              {timeline.map((entry, index) => {
                const isCurrent = index === timeline.length - 1;

                return (
                  <li
                    className={`timeline-item ${isCurrent ? 'is-current' : 'is-complete'}`}
                    key={`${entry.status}-${entry.created_at}`}
                  >
                    <span className="timeline-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                    </span>
                    <div className="timeline-copy">
                      <div className="timeline-heading">
                        <strong>{entry.status_label}</strong>
                        <time dateTime={entry.created_at}>
                          {formatOrderDateTime(entry.created_at)}
                        </time>
                      </div>
                      <p>{entry.catatan || 'Status pesanan diperbarui.'}</p>
                      <span>{entry.changed_by ? `Oleh: ${entry.changed_by}` : 'Oleh: Sistem'}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <aside className="update-card" aria-labelledby="update-title">
        <h2 id="update-title">Update Status Pesanan</h2>
        <p className="update-description">
          Perbarui progres pengerjaan. Pelanggan melihat status ini di halaman lacak pesanan.
        </p>

        {nextStatuses.length === 0 ? (
          <p className="update-description">
            Pesanan sudah {STATUS_LABELS[order.status].toLowerCase()} dan tidak dapat diubah lagi.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="form-label" htmlFor="status-select">
              Pilih Status Baru
            </label>
            <select
              className="status-select"
              id="status-select"
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as OrderStatus)}
            >
              {nextStatuses.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </select>

            <label className="form-label note-label" htmlFor="work-note">
              Catatan Pengerjaan {status === 'cancelled' ? '(wajib)' : '(opsional)'}
            </label>
            <textarea
              id="work-note"
              name="note"
              rows={4}
              placeholder="Contoh: Sepatu sudah melalui tahap deep cleaning, lanjut ke unyellowing..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              required={status === 'cancelled'}
            />

            <p className={`form-message${messageIsError ? ' is-error' : ''}`} role="status">
              {message}
            </p>
            <button className="save-button" type="submit" disabled={pending}>
              {pending ? 'Menyimpan…' : 'Simpan Perubahan Status'}
            </button>
            <p className="update-footnote">
              Status saat ini: <strong>{order.status_label}</strong>. Perubahan tersimpan di server.
            </p>
          </form>
        )}
      </aside>
    </div>
  );
}
