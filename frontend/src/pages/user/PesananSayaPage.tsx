import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UserHeader from '../../components/user/UserHeader';
import { getApiErrorMessage } from '../../api/client';
import { fetchMyOrders, formatOrderDateTime, type Order } from '../../api/orders';
import { FALLBACK_IMAGE } from '../../api/layanan';
import { formatCurrency } from '../../lib/checkout';
import '../../styles/pesanan-saya.css';

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Belum dibayar',
  paid: 'Lunas',
  expired: 'Kedaluwarsa',
  failed: 'Gagal',
};

function paymentLabel(status?: string | null): string {
  if (!status) return 'Belum ada pembayaran';
  return PAYMENT_LABELS[status] ?? status;
}

export default function PesananSayaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    document.title = 'Pesanan Saya — EaterSive';
  }, []);

  useEffect(() => {
    let alive = true;

    fetchMyOrders()
      .then((data) => {
        if (!alive) return;
        setOrders(data);
        setError('');
      })
      .catch((fetchError) => {
        if (!alive) return;
        setError(getApiErrorMessage(fetchError));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [reloadKey]);

  function retry() {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  return (
    <div id="page-pesanan-saya">
      <UserHeader />

      <main className="page-wrap">
        <section className="page-heading">
          <span className="breadcrumb">Pesanan Saya</span>
          <h1>Riwayat Pesanan</h1>
          <p>Semua pesanan yang pernah Anda buat, lengkap dengan status terkini dari server.</p>
        </section>

        <div className="orders-toolbar">
          <p>
            {loading
              ? 'Memuat pesanan…'
              : `${orders.length} pesanan tersimpan di akun Anda.`}
          </p>
          <Link className="button" to="/layanan">
            Pesan Layanan Lagi
          </Link>
        </div>

        {loading && (
          <div className="orders-state" role="status">
            <span className="orders-spinner" aria-hidden="true" />
            <p>Memuat pesanan dari server…</p>
          </div>
        )}

        {!loading && error && (
          <div className="orders-state orders-state--error" role="alert">
            <h2>Pesanan gagal dimuat</h2>
            <p>{error}</p>
            <button className="button" type="button" onClick={retry}>
              Coba Lagi
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="orders-state">
            <h2>Belum ada pesanan</h2>
            <p>
              Anda belum pernah melakukan booking. Mulai dengan memilih layanan cuci sepatu
              yang tersedia.
            </p>
            <Link className="button" to="/layanan">
              Pilih Layanan
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <section className="orders-list" aria-label="Daftar pesanan">
            {orders.map((order) => {
              const payment = order.pembayaran;
              const detailUrl = `/lacak-pesanan?order=${order.id}`;

              return (
                <article className="order-history-card" key={order.id}>
                  <header className="order-history-head">
                    <div>
                      <p className="order-history-code">
                        {order.kode_pesanan ?? `#${order.id}`}
                      </p>
                      <time dateTime={order.created_at}>
                        Dibuat {formatOrderDateTime(order.created_at)}
                      </time>
                    </div>
                    <span className={`order-history-status status--${order.status}`}>
                      {order.status_label}
                    </span>
                  </header>

                  <div className="order-history-body">
                    <img
                      src={order.layanan?.foto || FALLBACK_IMAGE}
                      alt={order.layanan?.nama ?? 'Layanan'}
                      loading="lazy"
                    />
                    <div className="order-history-info">
                      <h2>
                        {order.layanan?.nama ?? 'Layanan'}
                        {order.jumlah > 1 ? ` × ${order.jumlah}` : ''}
                      </h2>
                      {order.layanan?.kategori && (
                        <span className="order-history-category">{order.layanan.kategori}</span>
                      )}
                      <p className="order-history-address">
                        <span aria-hidden="true">⌖</span>
                        {order.alamat ?? 'Alamat belum tersedia'}
                      </p>
                      <p className={`order-history-payment${payment?.status_pembayaran === 'paid' ? ' is-paid' : ''}`}>
                        Pembayaran: {paymentLabel(payment?.status_pembayaran)}
                      </p>
                    </div>
                    <div className="order-history-total">
                      <span>Total</span>
                      <strong>{formatCurrency(order.total_harga)}</strong>
                    </div>
                  </div>

                  <details className="order-history-details">
                    <summary>Lihat detail pesanan</summary>
                    <dl>
                      <div>
                        <dt>Penerima</dt>
                        <dd>{order.nama}</dd>
                      </div>
                      <div>
                        <dt>Nomor telepon</dt>
                        <dd>{order.nomor_telp ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Catatan</dt>
                        <dd>{order.catatan || '—'}</dd>
                      </div>
                      <div>
                        <dt>Metode pembayaran</dt>
                        <dd>{payment?.metode_pembayaran ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Estimasi selesai</dt>
                        <dd>{order.estimasi_selesai ?? 'Belum tersedia'}</dd>
                      </div>
                    </dl>
                  </details>

                  <footer className="order-history-actions">
                    <Link className="button" to={detailUrl}>
                      Lacak Pesanan <span aria-hidden="true">→</span>
                    </Link>
                  </footer>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
