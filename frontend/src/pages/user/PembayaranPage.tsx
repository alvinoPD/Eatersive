import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import UserHeader from '../../components/user/UserHeader';
import { SERVICE_BY_ID } from '../../data/services';
import {
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

export default function PembayaranPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLFormElement>(null);
  const [savedAddressState] = useState(() => {
    const saved = readCheckoutAddress();
    return { saved, address: { ...EMPTY_ADDRESS, ...saved } };
  });
  const [address, setAddress] = useState<CheckoutAddress>(savedAddressState.address);
  const [addressSaved, setAddressSaved] = useState(Boolean(savedAddressState.saved));
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [addressMessage, setAddressMessage] = useState(
    savedAddressState.saved ? 'Alamat tersimpan di perangkat ini.' : '',
  );
  const [bookingMessage, setBookingMessage] = useState('');

  const items = useMemo(
    () => parseCartItems(new URLSearchParams(location.search).get('items')),
    [location.search],
  );

  const orderItems = useMemo(
    () =>
      Object.entries(items).map(([id, quantity]) => ({
        service: SERVICE_BY_ID[id],
        quantity,
      })),
    [items],
  );

  const total = orderItems.reduce(
    (sum, item) => sum + item.service.price * item.quantity,
    0,
  );

  useEffect(() => {
    document.title = 'Pembayaran — EaterSive';
  }, []);

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

  function handleBooking() {
    if (!formRef.current?.reportValidity()) {
      formRef.current?.querySelector<HTMLElement>(':invalid')?.focus();
      setBookingMessage('Lengkapi dan simpan alamat sebelum melanjutkan.');
      return;
    }

    if (!addressSaved) {
      setBookingMessage('Simpan alamat terlebih dahulu sebelum membuat booking.');
      return;
    }

    if (orderItems.length === 0) return;

    try {
      saveConfirmationOrder({
        orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date().toISOString(),
        address,
        items,
        paymentMethod: paymentMethod === 'qris' ? 'QRIS / E-Wallet' : paymentMethod,
      });
      navigate('/konfirmasi-pesanan');
    } catch (error) {
      console.error('Tidak dapat menyiapkan data konfirmasi:', error);
      setBookingMessage(
        'Pesanan tidak dapat disiapkan di browser ini. Coba lagi atau hubungi dukungan.',
      );
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
              <div className="summary-total">
                <strong>Total Bayar</strong>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <button
                className="book-button"
                type="button"
                disabled={orderItems.length === 0}
                onClick={handleBooking}
              >
                Booking Sekarang
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

            <section className="method-section" aria-labelledby="method-title">
              <h2 id="method-title">Metode Pembayaran</h2>
              <label className="payment-method">
                <input
                  type="radio"
                  name="payment-method"
                  value="qris"
                  checked={paymentMethod === 'qris'}
                  onChange={(event) => setPaymentMethod(event.target.value)}
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
                  <small>Scan Qris</small>
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
                    Pembayaran menggunakan QRIS dan Virtual Account akan terverifikasi secara
                    otomatis oleh sistem kami.
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
