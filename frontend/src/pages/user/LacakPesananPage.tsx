import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import UserHeader from '../../components/user/UserHeader';
import { getApiErrorMessage } from '../../api/client';
import {
  fetchOrderDetail,
  formatOrderDateTime,
  type Order,
  type OrderStatus,
} from '../../api/orders';
import { FALLBACK_IMAGE } from '../../api/layanan';
import { formatCurrency } from '../../lib/checkout';
import '../../styles/lacak-pesanan.css';

const STATUS_MARKERS: Record<OrderStatus, string> = {
  pending: '▣',
  confirmed: '⌖',
  processing: '✳',
  quality_check: '♧',
  completed: '◇',
  cancelled: '✕',
};

function formatDate(value: string | null, options: Intl.DateTimeFormatOptions) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', options).format(new Date(value));
}

export default function LacakPesananPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState('Klik untuk unggah foto sepatu bersih Anda');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Lacak Pesanan — EaterSive';
  }, []);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

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

  const timeline = useMemo(() => order?.timeline ?? [], [order]);
  const isFinished = order?.status === 'completed' || order?.status === 'cancelled';
  const canReview = order?.status === 'completed';

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

  function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessageIsError(false);

    if (!order) {
      setMessageIsError(true);
      setMessage('Pesanan belum tersedia untuk diberi ulasan.');
      return;
    }

    if (!canReview) {
      setMessageIsError(true);
      setMessage('Ulasan dapat dikirim setelah status pesanan selesai.');
      return;
    }

    if (rating === 0) {
      setMessageIsError(true);
      setMessage('Pilih rating bintang terlebih dahulu.');
      return;
    }

    const trimmedReview = reviewText.trim();
    if (!trimmedReview) return;

    try {
      window.localStorage.setItem(
        `eatersive-order-review-${order.id}`,
        JSON.stringify({
          orderId: order.kode_pesanan ?? order.id,
          rating,
          text: trimmedReview,
          createdAt: new Date().toISOString(),
        }),
      );
      setMessage('Terima kasih! Ulasan Anda tersimpan di perangkat ini.');
      setReviewSaved(true);
    } catch (reviewError) {
      console.error('Tidak dapat menyimpan ulasan:', reviewError);
      setMessageIsError(true);
      setMessage('Ulasan siap, tetapi tidak dapat disimpan di perangkat ini.');
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
            <p>
              Order ID: <strong>{order?.kode_pesanan ?? '—'}</strong>{' '}
              <span>{order ? formatOrderDateTime(order.created_at) : ''}</span>
            </p>
            <p>Status dan riwayat di bawah ini diambil langsung dari server EaterSive.</p>
          </section>

          <section className="timeline-card" aria-labelledby="timeline-title">
            <h2 id="timeline-title">
              <span aria-hidden="true">◷</span> Timeline Pengerjaan
            </h2>

            {loading && <p className="empty-order">Memuat status pesanan…</p>}

            {!loading && !orderId && (
              <p className="empty-order">
                Belum ada pesanan yang dipilih. Buka{' '}
                <Link to="/pesanan-saya">Pesanan Saya</Link> lalu pilih pesanan yang ingin
                dilacak.
              </p>
            )}

            {!loading && orderId && error && (
              <p className="empty-order" role="alert">
                {error}{' '}
                <Link to="/pesanan-saya">Kembali ke Pesanan Saya</Link>.
              </p>
            )}

            {!loading && order && timeline.length === 0 && (
              <p className="empty-order">Belum ada riwayat status untuk pesanan ini.</p>
            )}

            {!loading && order && timeline.length > 0 && (
              <ol className="timeline">
                {timeline.map((entry, index) => {
                  const isCurrent = index === timeline.length - 1 && !isFinished;
                  const isComplete = !isCurrent;

                  return (
                    <li
                      className={`timeline-step${isComplete ? ' is-complete' : ''}${
                        isCurrent ? ' is-current' : ''
                      }`}
                      key={`${entry.status}-${entry.created_at}`}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      <span className="timeline-marker" aria-hidden="true">
                        {STATUS_MARKERS[entry.status] ?? '•'}
                      </span>
                      <div className="timeline-copy">
                        <h3>
                          {entry.status_label}{' '}
                          {isCurrent && (
                            <span className="current-status">Status saat ini</span>
                          )}
                        </h3>
                        <p>{entry.catatan || 'Status pesanan diperbarui.'}</p>
                        <time dateTime={entry.created_at}>
                          {formatOrderDateTime(entry.created_at)}
                          {entry.changed_by ? ` · oleh ${entry.changed_by}` : ''}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {order && (
            <section className="service-details" aria-labelledby="details-title">
              <h2 id="details-title">
                <span aria-hidden="true">▧</span> Detail Item &amp; Layanan
              </h2>
              <article className="service-detail-card">
                <img
                  src={order.layanan?.foto || FALLBACK_IMAGE}
                  alt={order.layanan?.nama ?? 'Layanan'}
                />
                <div className="service-detail-main">
                  <div className="service-name-row">
                    <h3>
                      {order.layanan?.nama ?? 'Layanan'}
                      {order.jumlah > 1 ? ` × ${order.jumlah}` : ''}
                    </h3>
                    {order.layanan?.kategori && (
                      <span className="service-label">{order.layanan.kategori}</span>
                    )}
                  </div>
                  <p className="service-description">
                    {order.status === 'cancelled'
                      ? 'Pesanan ini dibatalkan.'
                      : `Status pesanan: ${order.status_label}.`}
                  </p>
                  <div className="service-specs">
                    <span>
                      Biaya Layanan
                      <strong>{formatCurrency(order.total_harga)}</strong>
                    </span>
                    <span>
                      Penjemputan<strong>Gratis</strong>
                    </span>
                    <span>
                      Metode<strong>Antar Jemput</strong>
                    </span>
                  </div>
                </div>
              </article>
              <div className="detail-info-grid">
                <article className="detail-info">
                  <h3>
                    <span aria-hidden="true">⌖</span> Alamat Penjemputan
                  </h3>
                  <p>{order.alamat || 'Alamat belum diisi'}</p>
                </article>
                <article className="detail-info">
                  <h3>
                    <span aria-hidden="true">◷</span> Estimasi Selesai
                  </h3>
                  <p>
                    {order.estimasi_selesai
                      ? `Pesanan Anda diperkirakan selesai pada ${formatDate(
                          order.estimasi_selesai,
                          {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          },
                        )}.`
                      : 'Estimasi selesai belum tersedia.'}
                  </p>
                </article>
                <article className="detail-info">
                  <h3>
                    <span aria-hidden="true">▱</span> Pembayaran
                  </h3>
                  <p>
                    {order.pembayaran
                      ? `${order.pembayaran.metode_pembayaran ?? '—'} · ${order.pembayaran.status_pembayaran} · ${formatCurrency(order.pembayaran.jumlah)}`
                      : 'Belum ada data pembayaran.'}
                  </p>
                </article>
              </div>
            </section>
          )}

          {order && (
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
                {!order
                  ? 'Buat pesanan terlebih dahulu untuk memberikan ulasan.'
                  : canReview
                    ? 'Bantu kami meningkatkan kualitas layanan EaterSive.'
                    : 'Ulasan dapat dikirim setelah pesanan selesai.'}
              </p>
            </div>
          </div>
          {order && canReview && (
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
              <button className="submit-review" type="submit" disabled={reviewSaved}>
                Kirim Ulasan
              </button>
            </form>
          )}
        </aside>
      </main>
    </div>
  );
}
