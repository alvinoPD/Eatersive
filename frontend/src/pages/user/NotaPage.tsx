import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useAuth from '../../auth/useAuth';
import { getApiErrorMessage } from '../../api/client';
import {
  fetchMyOrders,
  fetchOwnerOrders,
  fetchOrderDetail,
  formatOrderDateTime,
  paymentMethodLabel,
  PAYMENT_STATUS_LABELS,
  PHOTO_SIDE_LABELS,
  type Order,
} from '../../api/orders';
import { formatCurrency } from '../../lib/checkout';
import '../../styles/nota.css';

export default function NotaPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { session } = useAuth();
  const isOwner = session?.role === 'owner';
  const [order, setOrder] = useState<Order | null>(null);
  const [groupOrders, setGroupOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState(orderId ? '' : 'Nomor pesanan tidak valid.');

  useEffect(() => {
    document.title = 'Nota Pesanan — EaterSive';
  }, []);

  useEffect(() => {
    if (!orderId) return;

    let alive = true;

    Promise.all([
      fetchOrderDetail(orderId),
      isOwner ? fetchOwnerOrders() : fetchMyOrders(),
    ])
      .then(([detail, mine]) => {
        if (!alive) return;
        setOrder(detail);
        setGroupOrders(
          detail.kode_grup ? mine.filter((item) => item.kode_grup === detail.kode_grup) : [detail],
        );
        setError('');
      })
      .catch((fetchError) => {
        if (alive) setError(getApiErrorMessage(fetchError));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [isOwner, orderId]);

  const items = groupOrders.length > 0 ? groupOrders : order ? [order] : [];

  const totals = items.reduce(
    (sum, item) => ({
      subtotal: sum.subtotal + item.subtotal,
      discount: sum.discount + item.diskon,
      total: sum.total + item.total_harga,
    }),
    { subtotal: 0, discount: 0, total: 0 },
  );

  if (loading) {
    return (
      <main className="nota-loading" role="status">
        Memuat nota…
      </main>
    );
  }

  if (!order || error) {
    return (
      <main className="nota-loading" role="alert">
        <h1>Nota tidak ditemukan</h1>
        <p>{error}</p>
        <Link className="button" to="/pesanan-saya">
          Kembali ke Pesanan Saya
        </Link>
      </main>
    );
  }

  const photoBySide = Object.fromEntries(
    (order.photos ?? []).map((photo) => [photo.sisi, photo.url]),
  );

  return (
    <div id="page-nota">
      <div className="nota-toolbar no-print">
        <Link to={`/lacak-pesanan?order=${order.id}`}>← Kembali ke pelacakan</Link>
        <div>
          <Link className="button button--outline" to={`/konfirmasi-pesanan?order=${order.id}`}>
            Konfirmasi
          </Link>
          <button className="button" type="button" onClick={() => window.print()}>
            Cetak Nota
          </button>
        </div>
      </div>

      <main className="nota-sheet">
        <header className="nota-header">
          <div>
            <p className="nota-brand">EaterSive</p>
            <p>Shoe care, made simple</p>
            <p>Jl. Raya Surabaya No. 21, Jawa Timur</p>
            <p>WhatsApp: 0812-3456-7890 · halo@eatersive.id</p>
          </div>
          <div className="nota-title">
            <h1>NOTA PESANAN</h1>
            <p>
              <strong>{order.kode_pesanan ?? `#${order.id}`}</strong>
            </p>
            <p>{formatOrderDateTime(order.created_at)} WIB</p>
            <p className={`nota-status status--${order.status}`}>{order.status_label}</p>
          </div>
        </header>

        <section className="nota-meta">
          <div>
            <h2>Pelanggan</h2>
            <p>
              <strong>{order.nama}</strong>
            </p>
            <p>{order.nomor_telp ?? '—'}</p>
            <p>{order.alamat ?? '—'}</p>
          </div>
          <div>
            <h2>Pembayaran</h2>
            <p>Metode: {paymentMethodLabel(order.pembayaran?.metode_pembayaran)}</p>
            <p>
              Status:{' '}
              {PAYMENT_STATUS_LABELS[order.pembayaran?.status_pembayaran ?? ''] ?? 'Belum dibayar'}
            </p>
            <p>
              Estimasi selesai: {order.estimasi_selesai ?? 'Belum tersedia'}
            </p>
            {order.kode_grup && <p>Kode grup: {order.kode_grup}</p>}
          </div>
        </section>

        <table className="nota-table">
          <thead>
            <tr>
              <th scope="col">No</th>
              <th scope="col">Layanan</th>
              <th scope="col">Jumlah</th>
              <th scope="col">Harga</th>
              <th scope="col">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.layanan?.nama ?? 'Layanan'}</td>
                <td>{item.jumlah}</td>
                <td>{formatCurrency(item.layanan?.harga ?? item.subtotal / item.jumlah)}</td>
                <td>{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="nota-totals">
          <div>
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div>
              <span>Diskon member ({order.diskon_persen}%)</span>
              <span>−{formatCurrency(totals.discount)}</span>
            </div>
          )}
          <div className="nota-grand-total">
            <strong>Total</strong>
            <strong>{formatCurrency(totals.total)}</strong>
          </div>
        </section>

        <section className="nota-photos">
          <h2>Foto Kondisi Awal Sepatu</h2>
          <div className="nota-photo-grid">
            {(['depan', 'kanan', 'kiri', 'atas'] as const).map((side) => (
              <figure key={side}>
                {photoBySide[side] ? (
                  <img src={photoBySide[side]} alt={`Foto sepatu ${PHOTO_SIDE_LABELS[side]}`} />
                ) : (
                  <div className="nota-photo-empty">Belum ada foto</div>
                )}
                <figcaption>{PHOTO_SIDE_LABELS[side]}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {order.catatan && (
          <section className="nota-note">
            <h2>Catatan</h2>
            <p>{order.catatan}</p>
          </section>
        )}

        <footer className="nota-footer">
          <p>
            Nota ini dibuat otomatis oleh sistem EaterSive dan sah tanpa tanda tangan.
          </p>
          <p>Terima kasih telah mempercayakan sepatu Anda kepada kami.</p>
        </footer>
      </main>
    </div>
  );
}
