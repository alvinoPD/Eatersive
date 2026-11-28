import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import UserHeader from '../../components/user/UserHeader';
import ImageCarousel from '../../components/shared/ImageCarousel';
import { getApiErrorMessage } from '../../api/client';
import {
  fetchMyOrders,
  fetchOrderDetail,
  formatOrderDateTime,
  paymentMethodLabel,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from '../../api/orders';
import { createReview } from '../../api/reviews';
import { formatCurrency } from '../../lib/checkout';
import '../../styles/lacak-pesanan.css';

const STATUS_MARKER: Record<OrderStatus, string> = {
  pending: '▣',
  confirmed: '⌖',
  processing: '✳',
  quality_check: '♧',
  completed: '◇',
  cancelled: '×',
};

const STATUS_DESCRIPTION: Record<OrderStatus, string> = {
  pending: 'Pesanan sudah masuk dan menunggu konfirmasi owner.',
  confirmed: 'Pesanan dikonfirmasi dan sepatu dijadwalkan dijemput.',
  processing: 'Sepatu sedang dikerjakan oleh spesialis kami.',
  quality_check: 'Pengecekan kualitas sebelum sepatu dikembalikan.',
  completed: 'Sepatu selesai dan siap diantar kembali.',
  cancelled: 'Pesanan dibatalkan. Hubungi CS bila perlu bantuan.',
};

const ALL_STATUSES: OrderStatus[] = ORDER_STATUS_OPTIONS.map((option) => option.value);

export default function LacakPesananPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState('Klik untuk unggah foto sepatu bersih Anda');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Lacak Pesanan — EaterSive';
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        if (orderId) {
          const detail = await fetchOrderDetail(orderId);
          if (alive) setOrder(detail);
          return;
        }

        const mine = await fetchMyOrders();
        if (alive) setOrder(mine[0] ?? null);
      } catch (fetchError) {
        if (alive) setError(getApiErrorMessage(fetchError));
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [orderId]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const timeline = order?.timeline ?? [];
  const photos = (order?.photos ?? []).map((photo) => ({
    src: photo.url,
    alt: `Foto sepatu sisi ${photo.sisi}`,
    caption: photo.sisi,
  }));

  const currentStatus = order?.status ?? 'pending';
  const currentIndex = ALL_STATUSES.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  const address = order ? [order.alamat, order.nama].filter(Boolean) : [];

  const totals = useMemo(
    () => ({
      subtotal: order?.subtotal ?? 0,
      discount: order?.diskon ?? 0,
      total: order?.total_harga ?? 0,
    }),
    [order],
  );

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setPreviewUrl(null);

    if (!file) {
      setUploadLabel('Klik untuk unggah foto sepatu bersih Anda');
      return;
    }

    if (!file.type.startsWith('image/')) {
      event.target.value = '';
      setUploadLabel('File harus berupa gambar.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      setUploadLabel('Ukuran gambar maksimal 5 MB.');
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setUploadLabel(file.name);
  }

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessageIsError(false);

    if (!order) {
      setMessageIsError(true);
      setMessage('Pesanan belum tersedia untuk diberi ulasan.');
      return;
    }

    if (!order.layanan) {
      setMessageIsError(true);
      setMessage('Layanan pesanan tidak ditemukan, ulasan belum dapat dikirim.');
      return;
    }

    if (rating === 0) {
      setMessageIsError(true);
      setMessage('Pilih rating bintang terlebih dahulu.');
      return;
    }

    const trimmedReview = reviewText.trim();
    if (!trimmedReview) return;

    setReviewSaving(true);

    try {
      await createReview({
        layanan_id: order.layanan.id,
        isi_review: trimmedReview,
        rating,
        kode_pesanan: order.kode_pesanan,
      });
      setMessage('Terima kasih! Ulasan Anda sudah dikirim ke owner.');
      setReviewSaved(true);
    } catch (reviewError) {
      console.error('Tidak dapat mengirim ulasan:', reviewError);
      setMessageIsError(true);
      setMessage(getApiErrorMessage(reviewError));
    } finally {
      setReviewSaving(false);
    }
  }

  return (
    <div id="page-lacak">
      <UserHeader />

      <main className="tracking-layout">
        <div className="tracking-column">
          <section className="page-heading">
            <p className="eyebrow">
              <span aria-hidden="true">◉</span> Status Pesanan
            </p>
            <h1>Lacak Pesanan Anda</h1>
            {order && (
              <p>
                Order ID: <strong>{order.kode_pesanan ?? `#${order.id}`}</strong>{' '}
                <span>{formatOrderDateTime(order.created_at)}</span>
              </p>
            )}
            <p>Status di bawah ini diambil langsung dari riwayat pesanan di server.</p>
          </section>

          {loading && (
            <section className="timeline-card">
              <p className="empty-order" role="status">
                Memuat status pesanan…
              </p>
            </section>
          )}

          {!loading && error && (
            <section className="timeline-card">
              <p className="empty-order" role="alert">
                {error}
              </p>
              <p className="empty-order">
                <Link to="/pesanan-saya">Buka daftar pesanan saya</Link>.
              </p>
            </section>
          )}

          {!loading && !error && !order && (
            <section className="timeline-card">
              <p className="empty-order">
                Belum ada pesanan. Silakan <Link to="/layanan">pilih layanan</Link> dan selesaikan
                checkout.
              </p>
            </section>
          )}

          {!loading && order && (
            <>
              <section className="timeline-card" aria-labelledby="timeline-title">
                <h2 id="timeline-title">
                  <span aria-hidden="true">◷</span> Timeline Pengerjaan
                </h2>
                <div className={`order-status-banner${isCancelled ? ' is-cancelled' : ''}`}>
                  <span className="order-status-marker" aria-hidden="true">
                    {STATUS_MARKER[currentStatus]}
                  </span>
                  <div>
                    <strong>{order.status_label}</strong>
                    <p>{STATUS_DESCRIPTION[currentStatus]}</p>
                  </div>
                </div>

                {timeline.length > 0 ? (
                  <ol className="timeline">
                    {timeline.map((entry, index) => {
                      const isLast = index === timeline.length - 1;
                      return (
                        <li
                          className={`timeline-step is-complete${isLast ? ' is-current' : ''}`}
                          key={`${entry.status}-${entry.created_at}`}
                          aria-current={isLast ? 'step' : undefined}
                        >
                          <span className="timeline-marker" aria-hidden="true">
                            {STATUS_MARKER[entry.status] ?? '•'}
                          </span>
                          <div className="timeline-copy">
                            <h3>
                              {entry.status_label}
                              {isLast && <span className="current-status">Saat ini</span>}
                            </h3>
                            <p>{entry.catatan || STATUS_DESCRIPTION[entry.status]}</p>
                            <time>{formatOrderDateTime(entry.created_at)}</time>
                            {entry.changed_by && <small>Oleh: {entry.changed_by}</small>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="empty-order">Belum ada riwayat status.</p>
                )}

                {!isCancelled && currentIndex < ALL_STATUSES.indexOf('completed') && (
                  <p className="timeline-hint">
                    Status berikutnya: <strong>{ALL_STATUSES[currentIndex + 1] ? ORDER_STATUS_OPTIONS.find((option) => option.value === ALL_STATUSES[currentIndex + 1])?.label : 'Selesai'}</strong>
                  </p>
                )}
              </section>

              {photos.length > 0 && (
                <section className="service-details" aria-labelledby="photos-title">
                  <h2 id="photos-title">
                    <span aria-hidden="true">▣</span> Foto Sepatu
                  </h2>
                  <ImageCarousel
                    images={photos}
                    className="order-photo-carousel"
                    ariaLabel="Foto sepatu yang diunggah"
                  />
                </section>
              )}

              <section className="service-details" aria-labelledby="details-title">
                <h2 id="details-title">
                  <span aria-hidden="true">▧</span> Detail Item &amp; Layanan
                </h2>
                <article className="service-detail-card">
                  <div className="service-detail-main">
                    <div className="service-name-row">
                      <h3>
                        {order.layanan?.nama ?? 'Layanan'}
                        {order.jumlah > 1 ? ` × ${order.jumlah}` : ''}
                      </h3>
                      <span className="service-label">{order.layanan?.kategori ?? 'Cleaning'}</span>
                    </div>
                    <p className="service-description">
                      {order.catatan || 'Perawatan sepatu oleh spesialis EaterSive.'}
                    </p>
                    <div className="service-specs">
                      <span>
                        Subtotal<strong>{formatCurrency(totals.subtotal)}</strong>
                      </span>
                      <span>
                        Diskon<strong>−{formatCurrency(totals.discount)}</strong>
                      </span>
                      <span>
                        Total<strong>{formatCurrency(totals.total)}</strong>
                      </span>
                    </div>
                  </div>
                </article>
                <div className="detail-info-grid">
                  <article className="detail-info">
                    <h3>
                      <span aria-hidden="true">⌖</span> Alamat Penjemputan
                    </h3>
                    <p>{address.join(' · ') || 'Alamat belum diisi'}</p>
                  </article>
                  <article className="detail-info">
                    <h3>
                      <span aria-hidden="true">◷</span> Estimasi Selesai
                    </h3>
                    <p>
                      {order.estimasi_selesai
                        ? `Pesanan diperkirakan selesai pada ${order.estimasi_selesai}.`
                        : 'Estimasi belum tersedia.'}
                    </p>
                  </article>
                  <article className="detail-info">
                    <h3>
                      <span aria-hidden="true">▱</span> Pembayaran
                    </h3>
                    <p>
                      {paymentMethodLabel(order.pembayaran?.metode_pembayaran)} ·{' '}
                      {PAYMENT_STATUS_LABELS[order.pembayaran?.status_pembayaran ?? ''] ??
                        'Belum dibayar'}
                    </p>
                  </article>
                  <article className="detail-info">
                    <h3>
                      <span aria-hidden="true">♧</span> Nota
                    </h3>
                    <p>
                      <Link to={`/nota/${order.id}`}>Lihat &amp; cetak nota lengkap</Link>
                    </p>
                  </article>
                </div>
              </section>

              <aside className="info-alert">
                <span aria-hidden="true">ⓘ</span>
                <div>
                  <strong>Informasi Penting</strong>
                  <p>
                    Kami menjamin keamanan sepatu Anda 100%. Jika ada kendala dalam pengerjaan, tim
                    kami akan segera menghubungi Anda.
                  </p>
                </div>
              </aside>
            </>
          )}
        </div>

        <aside className="review-card" aria-labelledby="review-title">
          <div className="review-header">
            <span className="review-icon" aria-hidden="true">
              ▢
            </span>
            <div>
              <h2 id="review-title">Berikan Penilaian</h2>
              <p>
                {order
                  ? 'Bantu kami meningkatkan kualitas layanan EaterSive.'
                  : 'Buat pesanan terlebih dahulu untuk memberikan ulasan.'}
              </p>
            </div>
          </div>
          {order && (
            <form id="review-form" onSubmit={handleReviewSubmit}>
              <fieldset className="rating-field">
                <legend>Bagaimana pengalaman Anda?</legend>
                <div
                  className="star-rating"
                  role="radiogroup"
                  aria-label="Rating layanan"
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((value) => {
                    const filled = value <= (hoveredRating || rating);
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`${value <= rating ? 'is-selected ' : ''}${
                          value <= hoveredRating ? 'is-hovered' : ''
                        }`.trim()}
                        aria-label={`${value} bintang`}
                        aria-pressed={value === rating}
                        onMouseEnter={() => setHoveredRating(value)}
                        onClick={() => {
                          setRating(value);
                          setMessage('');
                          setMessageIsError(false);
                        }}
                      >
                        {filled ? '★' : '☆'}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label className="review-label" htmlFor="review-text">
                Tuliskan ulasan Anda
              </label>
              <textarea
                id="review-text"
                name="review"
                placeholder="Ceritakan pengalaman Anda menggunakan EaterSive..."
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                required
              />
              <label className="review-label" htmlFor="review-photo">
                Lampirkan Foto (Opsional)
              </label>
              <label className="upload-box" htmlFor="review-photo">
                <input
                  id="review-photo"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <span className="camera-icon" aria-hidden="true">
                  ▣
                </span>
                <span>{uploadLabel}</span>
              </label>
              {previewUrl && (
                <img className="photo-preview" src={previewUrl} alt="Pratinjau foto ulasan" />
              )}
              <p className={`review-message${messageIsError ? ' is-error' : ''}`} role="status">
                {message}
              </p>
              <button className="submit-review" type="submit" disabled={reviewSaved || reviewSaving}>
                {reviewSaving ? 'Mengirim…' : 'Kirim Ulasan'}
              </button>
            </form>
          )}
        </aside>
      </main>
    </div>
  );
}
