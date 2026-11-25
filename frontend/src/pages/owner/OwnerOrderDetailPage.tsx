import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import OwnerShell from '../../components/owner/OwnerShell';
import ImageCarousel from '../../components/shared/ImageCarousel';
import { getApiErrorMessage } from '../../api/client';
import {
  fetchOrderDetail,
  formatOrderDateTime,
  paymentMethodLabel,
  PAYMENT_STATUS_LABELS,
  PHOTO_SIDE_LABELS,
  updateOrderStatus,
  updatePaymentStatus,
  type Order,
  type OrderStatus,
} from '../../api/orders';
import { formatCurrency } from '../../lib/checkout';
import '../../styles/owner-order-detail.css';

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['quality_check', 'cancelled'],
  quality_check: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  processing: 'Sedang Dikerjakan',
  quality_check: 'Pengecekan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function OwnerOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState(orderId ? '' : 'ID pesanan tidak valid.');
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [saving, setSaving] = useState(false);

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
        setNextStatus(NEXT_STATUSES[detail.status][0] ?? '');
        setError('');
      })
      .catch((fetchError) => {
        if (!alive) {
          setOrder(null);
          setError(getApiErrorMessage(fetchError));
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [orderId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !nextStatus || saving) return;

    if (nextStatus === 'cancelled' && !note.trim()) {
      setMessageIsError(true);
      setMessage('Catatan wajib diisi saat membatalkan pesanan.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const updated = await updateOrderStatus(order.id, nextStatus, note);
      setOrder(updated);
      setNextStatus(NEXT_STATUSES[updated.status][0] ?? '');
      setNote('');
      setMessageIsError(false);
      setMessage(`Status berhasil diubah menjadi ${updated.status_label}.`);
    } catch (saveError) {
      setMessageIsError(true);
      setMessage(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function markPaid() {
    if (!order || saving) return;

    setSaving(true);
    setMessage('');

    try {
      const updated = await updatePaymentStatus(order.id, 'paid', 'Dibayar tunai.');
      setOrder(updated);
      setMessageIsError(false);
      setMessage('Pembayaran ditandai lunas.');
    } catch (saveError) {
      setMessageIsError(true);
      setMessage(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  const photos = (order?.photos ?? []).map((photo) => ({
    src: photo.url,
    alt: `Foto sepatu sisi ${photo.sisi}`,
    caption: PHOTO_SIDE_LABELS[photo.sisi],
  }));

  const availableStatuses = order ? NEXT_STATUSES[order.status] : [];
  const isCash = order?.pembayaran?.metode_pembayaran === 'cash';
  const isPaid = order?.pembayaran?.status_pembayaran === 'paid';

  return (
    <OwnerShell pageId="page-owner-order-detail" shellClassName="detail-shell" activeNav="orders">
      <main className="detail-content">
        <Link className="back-link" to="/owner/orders">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14 5-7 7 7 7M7 12h14" />
          </svg>
          Kembali
        </Link>

        {loading && (
          <p className="empty-state" role="status">
            Memuat detail pesanan…
          </p>
        )}

        {!loading && (!order || error) && (
          <>
            <section className="page-heading" aria-labelledby="page-title">
              <h1 id="page-title">Detail Pesanan</h1>
              <p>
                ID Pesanan: <strong>{orderId || '—'}</strong>
              </p>
            </section>
            <p className="empty-state" role="alert">
              {error || 'Pesanan tidak ditemukan.'}{' '}
              <Link to="/owner/orders">Lihat daftar pesanan</Link>.
            </p>
          </>
        )}

        {!loading && order && (
          <>
            <section className="page-heading" aria-labelledby="page-title">
              <h1 id="page-title">Detail Pesanan</h1>
              <p>
                ID Pesanan: <strong>{order.kode_pesanan ?? `#${order.id}`}</strong>
                <span className="heading-dot">•</span>Dibuat pada{' '}
                <time dateTime={order.created_at}>{formatOrderDateTime(order.created_at)}</time>
                <span className="heading-dot">•</span>
                <span className={`status status--${order.status}`}>{order.status_label}</span>
              </p>
            </section>

            <div className="detail-layout">
              <div className="detail-main">
                <div className="information-grid">
                  <section className="info-card" aria-labelledby="customer-title">
                    <h2 className="section-title" id="customer-title">
                      Informasi Pelanggan
                    </h2>
                    <div className="customer-profile">
                      <div>
                        <strong>{order.nama}</strong>
                        <a href={`tel:${order.nomor_telp ?? ''}`}>{order.nomor_telp ?? '—'}</a>
                      </div>
                    </div>
                    <div className="info-divider" />
                    <p className="field-label">Alamat Penjemputan</p>
                    <address>{order.alamat ?? '—'}</address>
                    {order.nomor_telp && (
                      <a
                        className="contact-button"
                        href={`https://wa.me/${order.nomor_telp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Hubungi Pelanggan
                      </a>
                    )}
                  </section>

                  <section className="info-card service-card" aria-labelledby="service-title">
                    <h2 className="section-title" id="service-title">
                      Informasi Layanan
                    </h2>
                    <div className="service-profile">
                      <div>
                        <strong>{order.layanan?.nama ?? 'Layanan'}</strong>
                        <span>
                          {order.layanan?.kategori ?? 'Cleaning'} · {order.jumlah} unit
                        </span>
                      </div>
                    </div>
                    <div className="service-specs">
                      <div>
                        <p className="field-label">Estimasi</p>
                        <strong>{order.layanan?.estimasi ?? '—'}</strong>
                      </div>
                      <div>
                        <p className="field-label">Selesai</p>
                        <strong>{order.estimasi_selesai ?? '—'}</strong>
                      </div>
                    </div>
                    <div className="info-divider" />
                    <p className="field-label">Catatan Pelanggan</p>
                    <p className="condition">{order.catatan || 'Tidak ada catatan.'}</p>
                  </section>
                </div>

                {photos.length > 0 && (
                  <section className="payment-card" aria-labelledby="photos-title">
                    <h2 className="section-title" id="photos-title">
                      Foto Sepatu Pelanggan
                    </h2>
                    <ImageCarousel
                      images={photos}
                      className="order-photo-carousel"
                      ariaLabel="Foto sepatu dari pelanggan"
                    />
                  </section>
                )}

                <section className="payment-card" aria-labelledby="payment-title">
                  <div className="payment-heading">
                    <h2 className="section-title" id="payment-title">
                      Ringkasan Pembayaran
                    </h2>
                    <Link className="outline-button" to={`/nota/${order.id}`}>
                      Lihat Nota
                    </Link>
                  </div>
                  <div className="payment-row">
                    <span>Subtotal</span>
                    <strong>{formatCurrency(order.subtotal)}</strong>
                  </div>
                  {order.diskon > 0 && (
                    <div className="payment-row is-discount">
                      <span>Diskon member ({order.diskon_persen}%)</span>
                      <strong>−{formatCurrency(order.diskon)}</strong>
                    </div>
                  )}
                  <div className="payment-row">
                    <span>Metode Pembayaran</span>
                    <strong>{paymentMethodLabel(order.pembayaran?.metode_pembayaran)}</strong>
                  </div>
                  <div className="payment-row">
                    <span>Status Pembayaran</span>
                    <strong>
                      {PAYMENT_STATUS_LABELS[order.pembayaran?.status_pembayaran ?? ''] ??
                        'Belum dibayar'}
                    </strong>
                  </div>
                  <div className="payment-total">
                    <strong>Total Pendapatan</strong>
                    <strong>{formatCurrency(order.total_harga)}</strong>
                  </div>
                  {isCash && !isPaid && (
                    <button
                      className="save-button"
                      type="button"
                      disabled={saving}
                      onClick={markPaid}
                    >
                      Tandai Lunas (Cash)
                    </button>
                  )}
                </section>

                <section className="history-card" aria-labelledby="history-title">
                  <h2 className="section-title" id="history-title">
                    Histori Pengerjaan
                  </h2>
                  <ol className="timeline">
                    {(order.timeline ?? []).map((entry, index, all) => (
                      <li
                        className={`timeline-item ${
                          index === all.length - 1 ? 'is-current' : 'is-complete'
                        }`}
                        key={`${entry.status}-${entry.created_at}`}
                      >
                        <div className="timeline-copy">
                          <div className="timeline-heading">
                            <strong>{entry.status_label}</strong>
                            <time dateTime={entry.created_at}>
                              {formatOrderDateTime(entry.created_at)}
                            </time>
                          </div>
                          <p>{entry.catatan || 'Status diperbarui.'}</p>
                          <span>{entry.changed_by ? `Oleh: ${entry.changed_by}` : 'Oleh: Sistem'}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {(order.timeline ?? []).length === 0 && (
                    <p className="empty-state">Belum ada riwayat status.</p>
                  )}
                </section>
              </div>

              <aside className="update-card" aria-labelledby="update-title">
                <h2 id="update-title">Update Status Pesanan</h2>
                <p className="update-description">
                  Perubahan langsung tersimpan di server dan terlihat oleh pelanggan.
                </p>
                {availableStatuses.length > 0 ? (
                  <form onSubmit={handleSubmit}>
                    <label className="form-label" htmlFor="status-select">
                      Pilih Status Baru
                    </label>
                    <select
                      className="status-select"
                      id="status-select"
                      value={nextStatus}
                      onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
                    >
                      {availableStatuses.map((option) => (
                        <option key={option} value={option}>
                          {STATUS_LABELS[option]}
                        </option>
                      ))}
                    </select>

                    <label className="form-label note-label" htmlFor="work-note">
                      Catatan Pengerjaan {nextStatus === 'cancelled' ? '(Wajib)' : '(Opsional)'}
                    </label>
                    <textarea
                      id="work-note"
                      rows={4}
                      placeholder="Contoh: Sepatu sudah melalui deep cleaning, lanjut unyellowing..."
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />

                    <p
                      className={`form-message${messageIsError ? ' is-error' : ''}`}
                      role="status"
                    >
                      {message}
                    </p>
                    <button className="save-button" type="submit" disabled={saving}>
                      {saving ? 'Menyimpan…' : 'Simpan Perubahan Status'}
                    </button>
                  </form>
                ) : (
                  <p className="empty-state">
                    Pesanan berstatus {order.status_label} dan tidak dapat diubah lagi.
                  </p>
                )}

                {(availableStatuses.length === 0 || !message) && (
                  <p className="update-footnote">
                    *Status mengikuti alur: Menunggu → Dikonfirmasi → Dikerjakan → Pengecekan →
                    Selesai.
                  </p>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </OwnerShell>
  );
}
