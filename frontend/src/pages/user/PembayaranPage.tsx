import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import UserHeader from '../../components/user/UserHeader';
import useAuth from '../../auth/useAuth';
import { getApiErrorMessage } from '../../api/client';
import { createOrder, uploadOrderPhotos, PHOTO_SIDES, PHOTO_SIDE_LABELS, type PhotoSide } from '../../api/orders';
import { useCatalog } from '../../lib/catalog-store';
import {
  createGroupCode,
  formatCurrency,
  parseCartItems,
  readCheckoutAddress,
  saveCheckoutAddress,
  saveConfirmationOrder,
} from '../../lib/checkout';
import type { CheckoutAddress } from '../../types/eatersive';
import '../../styles/pembayaran.css';

const EMPTY_ADDRESS: CheckoutAddress = {
  address: '',
  recipient: '',
  phone: '',
  notes: '',
};

const MAX_PHOTO_SIZE = 4 * 1024 * 1024;

export default function PembayaranPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { services } = useCatalog();
  const formRef = useRef<HTMLFormElement>(null);
  const previewUrls = useRef<string[]>([]);
  const [savedAddressState] = useState(() => {
    const saved = readCheckoutAddress();
    return { saved, address: { ...EMPTY_ADDRESS, ...saved } };
  });
  const [address, setAddress] = useState<CheckoutAddress>(savedAddressState.address);
  const [addressSaved, setAddressSaved] = useState(Boolean(savedAddressState.saved));
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'cash'>('qris');
  const [addressMessage, setAddressMessage] = useState(
    savedAddressState.saved ? 'Alamat tersimpan di perangkat ini.' : '',
  );
  const [bookingMessage, setBookingMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<PhotoSide, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<PhotoSide, string>>>({});

  const items = useMemo(
    () => parseCartItems(new URLSearchParams(location.search).get('items')),
    [location.search],
  );

  const serviceById = useMemo(
    () => Object.fromEntries(services.map((service) => [service.id, service])),
    [services],
  );

  const orderItems = useMemo(
    () =>
      Object.entries(items).flatMap(([id, quantity]) => {
        const service = serviceById[id];
        return service ? [{ service, quantity }] : [];
      }),
    [items, serviceById],
  );

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.service.price * item.quantity,
    0,
  );

  const discountPercent = session?.isMember ? session.discountPercent : 0;
  const discount = Math.round((subtotal * discountPercent) / 100);
  const total = Math.max(0, subtotal - discount);

  useEffect(() => {
    document.title = 'Pembayaran — EaterSive';
  }, []);

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  function updateAddress(field: keyof CheckoutAddress, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
    setBookingMessage('');
  }

  function handleSaveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current?.reportValidity()) return;

    try {
      saveCheckoutAddress(address);
      setAddressSaved(true);
      setAddressMessage('Alamat berhasil disimpan di perangkat ini.');
    } catch (error) {
      console.error('Tidak dapat menyimpan alamat:', error);
      setAddressSaved(true);
      setAddressMessage(
        'Alamat disimpan sementara untuk demo ini, tetapi tidak dapat disimpan di perangkat.',
      );
    }
    setBookingMessage('');
  }

  function handlePhotoChange(side: PhotoSide, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setBookingMessage('Foto barang harus berformat JPG, PNG, atau WebP.');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setBookingMessage('Ukuran setiap foto maksimal 4 MB.');
      return;
    }

    if (previews[side]) {
      URL.revokeObjectURL(previews[side]);
      previewUrls.current = previewUrls.current.filter((url) => url !== previews[side]);
    }

    const url = URL.createObjectURL(file);
    previewUrls.current.push(url);
    setPhotos((current) => ({ ...current, [side]: file }));
    setPreviews((current) => ({ ...current, [side]: url }));
    setBookingMessage('');
  }

  function removePhoto(side: PhotoSide) {
    if (previews[side]) {
      URL.revokeObjectURL(previews[side]);
      previewUrls.current = previewUrls.current.filter((url) => url !== previews[side]);
    }

    setPhotos((current) => {
      const next = { ...current };
      delete next[side];
      return next;
    });
    setPreviews((current) => {
      const next = { ...current };
      delete next[side];
      return next;
    });
  }

  async function handleBooking() {
    if (pending) return;

    if (!formRef.current?.reportValidity()) {
      formRef.current?.querySelector<HTMLElement>(':invalid')?.focus();
      setBookingMessage('Lengkapi dan simpan alamat sebelum melanjutkan.');
      return;
    }

    if (!addressSaved) {
      setBookingMessage('Simpan alamat terlebih dahulu sebelum membuat booking.');
      return;
    }

    if (orderItems.length === 0) {
      setBookingMessage('Layanan belum termuat. Muat ulang halaman lalu coba lagi.');
      return;
    }

    if (!session) {
      setBookingMessage('Silakan masuk terlebih dahulu agar pesanan tersimpan di akun Anda.');
      navigate('/login', { state: { from: '/pembayaran' } });
      return;
    }

    setPending(true);
    setBookingMessage('');

    try {
      const created = [];
      const groupCode = createGroupCode();

      for (const [id, quantity] of Object.entries(items)) {
        if (!serviceById[id]) continue;

        const order = await createOrder({
          layanan_id: Number(id),
          jumlah: quantity,
          nama: address.recipient,
          nomor_telp: address.phone,
          alamat: address.address,
          catatan: address.notes,
          metode_pembayaran: paymentMethod,
          kode_grup: groupCode,
        });

        created.push(order);
      }

      const first = created[0];

      if (!first) {
        setBookingMessage('Pesanan tidak dapat dibuat. Silakan coba lagi.');
        return;
      }

      let photoWarning = '';
      if (Object.keys(photos).length > 0) {
        try {
          await uploadOrderPhotos(groupCode, photos);
        } catch (photoError) {
          photoWarning = ` Pesanan tersimpan, tetapi foto gagal diunggah: ${getApiErrorMessage(photoError)}`;
        }
      }

      saveConfirmationOrder({
        orderId: first.kode_pesanan ?? `#${first.id}`,
        createdAt: first.created_at,
        address,
        items,
        paymentMethod:
          paymentMethod === 'cash' ? 'Cash / Bayar di Tempat' : 'QRIS / E-Wallet',
        orderIds: created.map((order) => order.id),
        total: created.reduce((sum, order) => sum + order.total_harga, 0),
        status: first.status_label,
        groupCode,
      });

      if (photoWarning) {
        window.sessionStorage.setItem('eatersive-checkout-warning', photoWarning.trim());
      }

      navigate(`/konfirmasi-pesanan?order=${first.id}`);
    } catch (error) {
      console.error('Tidak dapat membuat pesanan:', error);
      setBookingMessage(getApiErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div id="page-pembayaran">
      <UserHeader />

      <main className="page-wrap">
        <div className="breadcrumbs">
          <Link to="/layanan">
            <span aria-hidden="true">←</span> Kembali ke Layanan
          </Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Pembayaran</span>
        </div>
        <h1 className="page-title">Selesaikan Pembayaran Anda</h1>

        <div className="checkout-layout">
          <div className="checkout-column">
            <section className="address-card" aria-labelledby="address-title">
              <div className="card-title">
                <span className="title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </span>
                <h2 id="address-title">Tambah Alamat</h2>
              </div>
              <form id="address-form" ref={formRef} onSubmit={handleSaveAddress}>
                <label className="form-field">
                  <span>Alamat Lengkap</span>
                  <input
                    name="address"
                    autoComplete="street-address"
                    placeholder="Contoh: Jl. Yang pernah ada"
                    value={address.address}
                    onChange={(event) => updateAddress('address', event.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Nama Penerima</span>
                  <input
                    name="recipient"
                    autoComplete="name"
                    placeholder="Contoh: Jeong Jaehyun"
                    value={address.recipient}
                    onChange={(event) => updateAddress('recipient', event.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Nomor Telp</span>
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Contoh: 08123456789"
                    pattern="[0-9+() -]{8,20}"
                    value={address.phone}
                    onChange={(event) => updateAddress('phone', event.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  <span>Catatan</span>
                  <input
                    name="notes"
                    placeholder="Contoh: Rumah warna hitam"
                    value={address.notes}
                    onChange={(event) => updateAddress('notes', event.target.value)}
                  />
                </label>
                <div className="address-actions">
                  <p className="address-message" role="status" aria-live="polite">
                    {addressMessage}
                  </p>
                  <button className="save-button" type="submit">
                    Simpan Alamat
                  </button>
                </div>
              </form>
            </section>

            <section className="item-photo-card" aria-labelledby="item-photo-title">
              <div className="card-title">
                <span className="title-icon" aria-hidden="true">
                  ▣
                </span>
                <div>
                  <h2 id="item-photo-title">Foto Sepatu (Opsional)</h2>
                  <p>
                    Unggah 4 sisi sepatu agar petugas mengenali kondisi awal. Format JPG/PNG/WebP,
                    maksimal 4 MB per foto.
                  </p>
                </div>
              </div>
              <div className="item-photo-grid">
                {PHOTO_SIDES.map((side) => (
                  <div className={`item-photo-slot${previews[side] ? ' has-photo' : ''}`} key={side}>
                    {previews[side] ? (
                      <>
                        <img src={previews[side]} alt={`Foto sepatu ${PHOTO_SIDE_LABELS[side]}`} />
                        <button
                          className="item-photo-remove"
                          type="button"
                          aria-label={`Hapus foto ${PHOTO_SIDE_LABELS[side]}`}
                          onClick={() => removePhoto(side)}
                        >
                          ×
                        </button>
                        <span className="item-photo-label">{PHOTO_SIDE_LABELS[side]}</span>
                      </>
                    ) : (
                      <label className="item-photo-picker">
                        <span className="item-photo-icon" aria-hidden="true">
                          +
                        </span>
                        <strong>{PHOTO_SIDE_LABELS[side]}</strong>
                        <small>Pilih foto</small>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => handlePhotoChange(side, event)}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="method-section" aria-labelledby="method-title">
              <h2 id="method-title">Metode Pembayaran</h2>
              <label className={`payment-method${paymentMethod === 'qris' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="payment-method"
                  value="qris"
                  checked={paymentMethod === 'qris'}
                  onChange={() => setPaymentMethod('qris')}
                />
                <span className="qris-icon" aria-hidden="true">
                  <svg viewBox="0 0 32 32" fill="none">
                    <path
                      d="M5 5h8v8H5zM19 5h8v8h-8zM5 19h8v8H5z"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    />
                    <path
                      d="M8 8h2v2H8zm14 0h2v2h-2zM8 22h2v2H8zm8-7h3v3h-3zm5 0h5m-5 3h2m-7 2h3v5m4-5h5v5h-5z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span className="method-copy">
                  <strong>QRIS (Pembayaran Instan)</strong>
                  <small>Scan QRIS, terverifikasi otomatis</small>
                  <span className="wallet-list">
                    <i>Shopeepay</i>
                    <i>Gopay</i>
                    <i>OVO</i>
                    <i>LinkAja</i>
                    <i>Dana</i>
                  </span>
                </span>
                <span className="radio-indicator" aria-hidden="true" />
              </label>

              <label className={`payment-method${paymentMethod === 'cash' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="payment-method"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                />
                <span className="cash-icon" aria-hidden="true">
                  ▤
                </span>
                <span className="method-copy">
                  <strong>Cash / Bayar di Tempat</strong>
                  <small>Bayar tunai saat sepatu diantar; owner menandai lunas.</small>
                </span>
                <span className="radio-indicator" aria-hidden="true" />
              </label>
            </section>
          </div>

          <div className="payment-column">
            <div className="security-label">
              <span aria-hidden="true">♢</span> Terenkripsi Aman
            </div>
            <section className="summary-card" aria-labelledby="summary-title">
              <div className="summary-heading">
                <h2 id="summary-title">Ringkasan Pesanan</h2>
                <p>Detail layanan yang telah Anda pilih</p>
              </div>
              <ul className="summary-items" aria-live="polite">
                {orderItems.map(({ service, quantity }) => (
                  <li className="summary-item" key={service.id}>
                    <img src={service.thumbnail} alt="" loading="lazy" />
                    <span className="summary-item-info">
                      <strong>
                        {quantity > 1 ? `${service.name} × ${quantity}` : service.name}
                      </strong>
                      <small>{service.description}</small>
                    </span>
                    <span className="summary-item-price">
                      {formatCurrency(service.price * quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              {orderItems.length === 0 && (
                <div className="summary-empty">
                  Pesanan belum tersedia. <Link to="/layanan">Pilih layanan</Link> terlebih
                  dahulu.
                </div>
              )}

              {session?.isMember && (
                <p className="member-notice">
                  <strong>Member {session.membershipPlan ?? 'EaterSive'}</strong> aktif — diskon{' '}
                  {discountPercent}% diterapkan otomatis.
                </p>
              )}

              <div className="summary-breakdown">
                <div>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="is-discount">
                    <span>Diskon member ({discountPercent}%)</span>
                    <span>−{formatCurrency(discount)}</span>
                  </div>
                )}
              </div>

              <div className="summary-total">
                <strong>Total Bayar</strong>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <button
                className="book-button"
                type="button"
                disabled={orderItems.length === 0 || pending}
                onClick={handleBooking}
              >
                {pending ? 'Memproses Pesanan…' : 'Booking Sekarang'}
              </button>
              <p className="terms-note">
                Dengan mengklik tombol di atas, Anda menyetujui{' '}
                <Link to="/#faq">Syarat &amp; Ketentuan</Link>
                <br className="desktop-break" /> layanan EaterSive.
              </p>
              <p className="booking-message" role="status" aria-live="polite">
                {bookingMessage}
              </p>
            </section>

            <div className="payment-notes">
              <article>
                <span className="note-icon" aria-hidden="true">
                  ↺
                </span>
                <div>
                  <h3>Kebijakan Pembatalan</h3>
                  <p>
                    Pembatalan dapat dilakukan sebelum kurir kami menjemput sepatu Anda. Refund
                    akan diproses maksimal 3 hari kerja.
                  </p>
                </div>
              </article>
              <article>
                <span className="note-icon" aria-hidden="true">
                  ✓
                </span>
                <div>
                  <h3>Konfirmasi Otomatis</h3>
                  <p>
                    Pembayaran QRIS terverifikasi otomatis. Pembayaran cash dicatat manual oleh
                    owner saat pelunasan.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
