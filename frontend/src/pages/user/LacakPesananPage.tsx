import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import UserHeader from '../../components/user/UserHeader';
import { SERVICE_BY_ID } from '../../data/services';
import { formatCurrency, readConfirmationOrder } from '../../lib/checkout';
import '../../styles/lacak-pesanan.css';

const REVIEW_STORAGE_KEY = 'eatersive-order-review';
const STAGE_OFFSETS = [-2, -1, -0.05, 1, 2];

const TIMELINE_STEPS = [
  {
    marker: '▣',
    title: 'Pesanan Diterima',
    description:
      'Pesanan Anda telah masuk ke sistem kami dan sedang menunggu verifikasi.',
    showStatus: false,
  },
  {
    marker: '⌖',
    title: 'Kurir Menuju Lokasi',
    description: 'Kurir EaterSive sedang dalam perjalanan untuk menjemput sepatu Anda.',
    showStatus: false,
  },
  {
    marker: '✳',
    title: 'Sedang Dibersihkan',
    description:
      'Sepatu Anda sedang ditangani oleh spesialis kami menggunakan metode deep cleaning.',
    showStatus: true,
  },
  {
    marker: '♧',
    title: 'Pengecekan Kualitas',
    description: 'Memastikan setiap detail sepatu bersih sempurna sebelum dikembalikan.',
    showStatus: false,
  },
  {
    marker: '◇',
    title: 'Pesanan Selesai',
    description: 'Sepatu bersih Anda siap dikirimkan kembali ke alamat tujuan.',
    showStatus: false,
  },
];

function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('id-ID', options).format(date);
}

export default function LacakPesananPage() {
  const [order] = useState(() => readConfirmationOrder());
  const [now] = useState(() => new Date());
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

  const itemEntries = order ? Object.entries(order.items) : [];
  const firstItem = itemEntries[0];
  const service = firstItem ? SERVICE_BY_ID[firstItem[0]] : null;
  const firstQuantity = firstItem ? firstItem[1] : 0;

  const elapsedMinutes = order
    ? Math.max(0, (now.getTime() - new Date(order.createdAt).getTime()) / 60000)
    : 0;
  const currentStage = !order
    ? 0
    : elapsedMinutes >= 2880
      ? 4
      : elapsedMinutes >= 1440
        ? 3
        : elapsedMinutes >= 180
          ? 2
          : elapsedMinutes >= 30
            ? 1
            : 0;

  const currentStatusLabel =
    currentStage === 0
      ? 'Menunggu'
      : currentStage === 1
        ? 'Dalam Perjalanan'
        : currentStage === 4
          ? 'Selesai'
          : 'Sedang Berjalan';

  const address =
    order &&
    [order.address.address, order.address.recipient].map((part) => part.trim()).filter(Boolean);

  const estimatedDate = order ? new Date(order.createdAt) : null;
  estimatedDate?.setDate(estimatedDate.getDate() + 3);

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

    if (rating === 0) {
      setMessageIsError(true);
      setMessage('Pilih rating bintang terlebih dahulu.');
      return;
    }

    const trimmedReview = reviewText.trim();
    if (!trimmedReview) return;

    try {
      window.localStorage.setItem(
        REVIEW_STORAGE_KEY,
        JSON.stringify({
          orderId: order.orderId,
          rating,
          text: trimmedReview,
          createdAt: new Date().toISOString(),
        }),
      );
      setMessage('Terima kasih! Ulasan Anda tersimpan di perangkat ini untuk demo.');
      setReviewSaved(true);
    } catch (error) {
      console.error('Tidak dapat menyimpan ulasan:', error);
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
              Order ID: <strong>{order?.orderId ?? '—'}</strong>{' '}
              <span>
                {order
                  ? formatDate(new Date(order.createdAt), {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : ''}
              </span>
            </p>
            <p>Status di bawah ini merupakan simulasi demo lokal, bukan data dari server.</p>
          </section>

          <section className="timeline-card" aria-labelledby="timeline-title">
            <h2 id="timeline-title">
              <span aria-hidden="true">◷</span> Timeline Pengerjaan
            </h2>
            {order ? (
              <ol className="timeline">
                {TIMELINE_STEPS.map((step, index) => {
                  const eventDate = new Date(
                    new Date(order.createdAt).getTime() + STAGE_OFFSETS[index] * 60 * 60 * 1000,
                  );
                  const isComplete = index < currentStage;
                  const isCurrent = index === currentStage;

                  return (
                    <li
                      className={`timeline-step${isComplete ? ' is-complete' : ''}${
                        isCurrent ? ' is-current' : ''
                      }`}
                      key={step.title}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      <span className="timeline-marker" aria-hidden="true">
                        {step.marker}
                      </span>
                      <div className="timeline-copy">
                        <h3>
                          {step.title}{' '}
                          {step.showStatus && (
                            <span className="current-status">{currentStatusLabel}</span>
                          )}
                        </h3>
                        <p>{step.description}</p>
                        <time>
                          {isComplete
                            ? formatDate(eventDate, {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : isCurrent
                              ? `Update ${formatDate(now, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`
                              : `Estimasi: ${formatDate(eventDate, {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}`}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="empty-order">
                Data pesanan belum tersedia. Silakan <Link to="/layanan">pilih layanan</Link> dan
                selesaikan checkout.
              </p>
            )}
          </section>

          {order && service && (
            <section className="service-details" aria-labelledby="details-title">
              <h2 id="details-title">
                <span aria-hidden="true">▧</span> Detail Item &amp; Layanan
              </h2>
              <article className="service-detail-card">
                <img src={service.image} alt={service.name} />
                <div className="service-detail-main">
                  <div className="service-name-row">
                    <h3>
                      {firstQuantity > 1 ? `${service.name} × ${firstQuantity}` : service.name}
                    </h3>
                    <span className="service-label">{service.category}</span>
                  </div>
                  <p className="service-description">{service.description}</p>
                  <div className="service-specs">
                    <span>
                      Biaya Layanan
                      <strong>{formatCurrency(service.price * firstQuantity)}</strong>
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
                  <p>{address?.join(' · ') || 'Alamat belum diisi'}</p>
                </article>
                <article className="detail-info">
                  <h3>
                    <span aria-hidden="true">◷</span> Estimasi Selesai
                  </h3>
                  <p>
                    {estimatedDate
                      ? `Pesanan Anda diperkirakan selesai pada ${formatDate(estimatedDate, {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}.`
                      : '—'}
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
