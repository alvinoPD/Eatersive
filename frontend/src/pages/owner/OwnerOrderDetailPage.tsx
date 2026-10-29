import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import OwnerShell from '../../components/owner/OwnerShell';
import { OWNER_ORDER_BY_ID } from '../../data/ownerOrders';
import { formatCurrency } from '../../lib/checkout';
import type { OrderProgress, OwnerOrderDetail } from '../../types/eatersive';
import '../../styles/owner-order-detail.css';

const STATUS_OPTIONS = [
  'Sedang Dikerjakan',
  'Menunggu',
  'Pengecekan',
  'Siap Diantar',
  'Selesai',
];

function formatCreatedDate(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .replace(',', '');
}

function formatTimelineDate(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .replace(',', '');
}

function readProgress(storageKey: string): OrderProgress | null {
  try {
    const rawProgress = window.localStorage.getItem(storageKey);
    if (!rawProgress) return null;

    const parsed: unknown = JSON.parse(rawProgress);
    if (!parsed || typeof parsed !== 'object') return null;

    const candidate = parsed as Partial<OrderProgress>;
    if (
      typeof candidate.status !== 'string' ||
      typeof candidate.note !== 'string' ||
      typeof candidate.updatedAt !== 'string'
    ) {
      return null;
    }

    return {
      status: candidate.status,
      note: candidate.note,
      updatedAt: candidate.updatedAt,
    };
  } catch {
    return null;
  }
}

export default function OwnerOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const order = orderId ? OWNER_ORDER_BY_ID[orderId] : undefined;

  useEffect(() => {
    document.title = 'Detail Pesanan — EaterSive';
  }, []);

  if (!order) {
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
              ID Pesanan: <strong>{orderId || '—'}</strong>
            </p>
          </section>
          <p className="empty-state">
            Pesanan ini belum tersedia. Daftar pesanan masih kosong sampai data pesanan masuk ke
            sistem. <Link to="/owner/orders">Lihat daftar pesanan</Link>.
          </p>
        </main>
      </OwnerShell>
    );
  }

  return <OwnerOrderDetailView order={order} orderNumber={orderId ?? order.id} />;
}

function OwnerOrderDetailView({
  order,
  orderNumber,
}: {
  order: OwnerOrderDetail;
  orderNumber: string;
}) {
  const storageKey = `eatersive-order-progress-${orderNumber}`;
  const createdAt = new Date(order.createdAt);

  const [initialProgress] = useState(() => readProgress(storageKey));
  const [status, setStatus] = useState(initialProgress?.status ?? order.status);
  const [note, setNote] = useState(initialProgress?.note ?? '');
  const [currentStatus, setCurrentStatus] = useState(
    initialProgress?.status ?? order.status,
  );
  const [currentNote, setCurrentNote] = useState(initialProgress?.note ?? order.note);
  const [currentTime, setCurrentTime] = useState(
    initialProgress?.updatedAt
      ? formatTimelineDate(new Date(initialProgress.updatedAt))
      : formatTimelineDate(createdAt),
  );
  const [currentAuthor, setCurrentAuthor] = useState(
    initialProgress ? 'Oleh: Admin EaterSive' : 'Oleh: Sistem',
  );
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoTargetRef = useRef<'before' | 'after'>('before');

  const phoneDigits = order.customerPhone.replace(/\D/g, '');

  function readPhoto(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Foto tidak dapat ditampilkan.'));
      });
      reader.addEventListener('error', () => reject(new Error('Foto gagal dibaca.')));
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      if (files.length > 1) {
        const [first, second] = await Promise.all([readPhoto(files[0]), readPhoto(files[1])]);
        setBeforePhoto(first);
        setAfterPhoto(second);
      } else {
        const dataUrl = await readPhoto(files[0]);
        if (photoTargetRef.current === 'before') setBeforePhoto(dataUrl);
        else setAfterPhoto(dataUrl);
      }
      setMessageIsError(false);
      setMessage('Foto siap dilampirkan saat status disimpan.');
    } catch (error) {
      console.error('Tidak dapat membaca foto:', error);
      setMessageIsError(true);
      setMessage('Foto gagal dibaca. Silakan coba file lain.');
    }

    event.target.value = '';
  }

  function openPhotoPicker(target: 'before' | 'after') {
    photoTargetRef.current = target;
    photoInputRef.current?.click();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const progress: OrderProgress = {
      status,
      note: note.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch (error) {
      console.error('Tidak dapat menyimpan progres pesanan:', error);
      setMessageIsError(true);
      setMessage('Perubahan gagal disimpan di browser ini.');
      return;
    }

    setCurrentStatus(progress.status);
    setCurrentNote(progress.note || 'Status pengerjaan diperbarui.');
    setCurrentTime(formatTimelineDate(new Date(progress.updatedAt)));
    setCurrentAuthor('Oleh: Admin EaterSive');
    setMessageIsError(false);
    setMessage('Status pesanan berhasil diperbarui dan disimpan di perangkat ini.');
  }

  const timelineBase = [
    {
      title: 'Pesanan Dibuat',
      description: 'Pelanggan melakukan checkout.',
      author: 'Oleh: Sistem',
      offsetHours: 0,
    },
    {
      title: 'Pembayaran Dikonfirmasi',
      description: 'Pembayaran via QRIS terverifikasi.',
      author: 'Oleh: Admin (Setyo)',
      offsetHours: 0.75,
    },
    {
      title: 'Sepatu Diterima di Workshop',
      description: 'Pengecekan awal: Sesuai deskripsi.',
      author: 'Oleh: Admin (Setyo)',
      offsetHours: 4.5,
    },
  ];

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
            ID Pesanan: <strong>{orderNumber}</strong>
            <span className="heading-dot">•</span>Dibuat pada{' '}
            <time dateTime={order.createdAt}>{formatCreatedDate(createdAt)}</time>
          </p>
        </section>

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
                  <img src={order.customerAvatar} alt="" />
                  <div>
                    <strong>{order.customer}</strong>
                    <a href={`tel:${phoneDigits}`}>{order.customerPhone}</a>
                  </div>
                </div>
                <div className="info-divider" />
                <p className="field-label">Alamat Pengiriman</p>
                <address>{order.address}</address>
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
                    {order.icon}
                  </span>
                  <div>
                    <strong>{order.service}</strong>
                    <span>{order.product}</span>
                  </div>
                </div>
                <div className="service-specs">
                  <div>
                    <p className="field-label">Ukuran</p>
                    <strong>{order.size}</strong>
                  </div>
                  <div>
                    <p className="field-label">Warna</p>
                    <strong>{order.color}</strong>
                  </div>
                </div>
                <div className="info-divider" />
                <p className="field-label">Kondisi Awal</p>
                <p className="condition">{order.condition}</p>
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
                <span>{order.paymentService}</span>
                <strong>{formatCurrency(order.servicePrice)}</strong>
              </div>
              <div className="payment-row">
                <span>Ongkos Kirim (Antar-Jemput)</span>
                <strong>{formatCurrency(order.deliveryPrice)}</strong>
              </div>
              <div className="payment-total">
                <strong>Total Pendapatan</strong>
                <strong>{formatCurrency(order.servicePrice + order.deliveryPrice)}</strong>
              </div>
              <p className="payment-note">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" />
                  <path d="m8.5 12 2.3 2.3 4.8-5" />
                </svg>
                Metode pembayaran: QRIS (data demo)
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
              <ol className="timeline">
                {timelineBase.map((item) => {
                  const eventDate = new Date(
                    createdAt.getTime() + item.offsetHours * 60 * 60 * 1000,
                  );
                  return (
                    <li className="timeline-item is-complete" key={item.title}>
                      <span className="timeline-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="8" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                      </span>
                      <div className="timeline-copy">
                        <div className="timeline-heading">
                          <strong>{item.title}</strong>
                          <time dateTime={eventDate.toISOString()}>
                            {formatTimelineDate(eventDate)}
                          </time>
                        </div>
                        <p>{item.description}</p>
                        <span>{item.author}</span>
                      </div>
                    </li>
                  );
                })}
                <li className="timeline-item is-current">
                  <span className="timeline-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 3v4m0 10v4m9-9h-4M7 12H3m15.4-6.4-2.8 2.8M8.4 15.6l-2.8 2.8m13.8 0-2.8-2.8m-8.2-8.2L5.6 5.6" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                  </span>
                  <div className="timeline-copy">
                    <div className="timeline-heading">
                      <strong>{currentStatus}</strong>
                      <time>{currentTime}</time>
                    </div>
                    <p>{currentNote}</p>
                    <span>{currentAuthor}</span>
                  </div>
                </li>
              </ol>
            </section>
          </div>

          <aside className="update-card" aria-labelledby="update-title">
            <h2 id="update-title">Update Status Pesanan</h2>
            <p className="update-description">
              Perbarui progres pengerjaan untuk memberi tahu pelanggan secara real-time.
            </p>
            <form onSubmit={handleSubmit}>
              <label className="form-label" htmlFor="status-select">
                Pilih Status Baru
              </label>
              <select
                className="status-select"
                id="status-select"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <label className="form-label note-label" htmlFor="work-note">
                Catatan Pengerjaan (Opsional)
              </label>
              <textarea
                id="work-note"
                name="note"
                rows={4}
                placeholder="Contoh: Sepatu sudah melalui tahap deep cleaning, lanjut ke unyellowing..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />

              <div className="photo-heading">
                <span>Lampiran Foto (Before/After)</span>
                <button
                  className="add-photo"
                  type="button"
                  onClick={() =>
                    openPhotoPicker(beforePhoto ? 'after' : 'before')
                  }
                >
                  Tambah Foto
                </button>
              </div>
              <input
                ref={photoInputRef}
                className="visually-hidden"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
              />
              <div className="photo-grid">
                <button
                  className="photo-upload"
                  type="button"
                  onClick={() => openPhotoPicker('before')}
                >
                  {beforePhoto ? (
                    <img src={beforePhoto} alt="Foto sebelum pengerjaan" />
                  ) : (
                    <span className="upload-placeholder">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                      <span>Foto Sebelum</span>
                    </span>
                  )}
                </button>
                <button
                  className="photo-upload"
                  type="button"
                  onClick={() => openPhotoPicker('after')}
                >
                  {afterPhoto ? (
                    <img src={afterPhoto} alt="Foto sesudah pengerjaan" />
                  ) : (
                    <span className="upload-placeholder">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                      <span>Foto Sesudah</span>
                    </span>
                  )}
                </button>
              </div>
              <p className={`form-message${messageIsError ? ' is-error' : ''}`} role="status">
                {message}
              </p>
              <button className="save-button" type="submit">
                Simpan Perubahan Status
              </button>
              <p className="update-footnote">
                *Perubahan status disimpan di perangkat ini untuk demo; belum dikirim ke pelanggan.
              </p>
            </form>
          </aside>
        </div>
      </main>
    </OwnerShell>
  );
}
