import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OwnerShell from '../../components/owner/OwnerShell';
import { getApiErrorMessage } from '../../api/client';
import {
  fetchOwnerOrders,
  formatOrderDateTime,
  paymentMethodLabel,
  PAYMENT_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from '../../api/orders';
import { formatCurrency } from '../../lib/checkout';
import '../../styles/owner-orders.css';

type SortOrder = 'newest' | 'oldest' | 'customer';
type CategoryFilter = 'all' | 'Cleaning' | 'Treatment' | 'Repair' | 'Unyellowing';
type StatusFilter = 'all' | OrderStatus;

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'quality_check'];

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: 'status--waiting',
  confirmed: 'status--process',
  processing: 'status--process',
  quality_check: 'status--process',
  completed: 'status--done',
  cancelled: 'status--cancelled',
};

export default function OwnerOrdersPage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');

  useEffect(() => {
    document.title = 'Kelola Pesanan — EaterSive';
  }, []);

  useEffect(() => {
    let alive = true;

    fetchOwnerOrders()
      .then((data) => {
        if (!alive) return;
        setOrders(data);
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
  }, []);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id');

    return orders
      .filter((order) => {
        const serviceCategory = order.layanan?.kategori ?? '';
        const matchesCategory = category === 'all' || serviceCategory === category;
        const matchesStatus = status === 'all' || order.status === status;
        const haystack = `${order.kode_pesanan ?? ''} ${order.nama} ${order.nomor_telp ?? ''} ${order.layanan?.nama ?? ''} ${serviceCategory} ${order.status_label}`;
        const matchesQuery = haystack.toLocaleLowerCase('id').includes(query);

        return matchesCategory && matchesStatus && matchesQuery;
      })
      .sort((first, second) => {
        if (sort === 'customer') return first.nama.localeCompare(second.nama, 'id');
        if (sort === 'oldest') return first.id - second.id;
        return second.id - first.id;
      });
  }, [category, orders, search, sort, status]);

  const totalOrders = orders.length;
  const processOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length;
  const doneOrders = orders.filter((order) => order.status === 'completed').length;

  function openOrder(orderId: number) {
    navigate(`/owner/orders/${orderId}`);
  }

  return (
    <OwnerShell pageId="page-owner-orders" shellClassName="orders-shell" activeNav="orders">
      <main className="orders-content">
        <section className="page-heading" aria-labelledby="page-title">
          <h1 id="page-title">Kelola Pesanan</h1>
          <p>Semua booking pelanggan masuk ke sini secara real-time dari database.</p>
        </section>

        {error && (
          <p className="page-error" role="alert">
            {error}
          </p>
        )}

        <section className="summary-grid" aria-label="Ringkasan pesanan">
          <article className="summary-card summary-card--total">
            <div>
              <p>Total Pesanan</p>
              <strong>
                {loading ? <span className="skeleton-line skeleton-line--stat" /> : totalOrders}
              </strong>
            </div>
          </article>
          <article className="summary-card">
            <div>
              <p>Proses</p>
              <strong>
                {loading ? <span className="skeleton-line skeleton-line--stat" /> : processOrders}
              </strong>
            </div>
          </article>
          <article className="summary-card">
            <div>
              <p>Selesai</p>
              <strong>
                {loading ? <span className="skeleton-line skeleton-line--stat" /> : doneOrders}
              </strong>
            </div>
          </article>
        </section>

        <section className="orders-panel" aria-label="Daftar pesanan">
          <div className="table-toolbar">
            <label className="search-field">
              <span className="visually-hidden">Cari pesanan, pelanggan, atau telepon</span>
              <input
                ref={searchRef}
                type="search"
                placeholder="Cari kode, pelanggan, layanan..."
                autoComplete="off"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="select-field select-field--category">
              <span className="visually-hidden">Filter kategori</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CategoryFilter)}
              >
                <option value="all">Filter Kategori</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Treatment">Treatment</option>
                <option value="Repair">Repair</option>
                <option value="Unyellowing">Unyellowing</option>
              </select>
            </label>
            <label className="select-field">
              <span className="visually-hidden">Filter status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
              >
                <option value="all">Filter Status</option>
                <option value="pending">Menunggu</option>
                <option value="confirmed">Dikonfirmasi</option>
                <option value="processing">Dikerjakan</option>
                <option value="quality_check">Pengecekan</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </label>
            <label className="select-field select-field--sort">
              <span className="visually-hidden">Urutkan pesanan</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}>
                <option value="newest">Urutkan: Terbaru</option>
                <option value="oldest">Urutkan: Terlama</option>
                <option value="customer">Urutkan: Nama A–Z</option>
              </select>
            </label>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col" className="number-cell">
                    No
                  </th>
                  <th scope="col">ID Pesanan</th>
                  <th scope="col">Pelanggan</th>
                  <th scope="col">Layanan</th>
                  <th scope="col">Total</th>
                  <th scope="col">Pembayaran</th>
                  <th scope="col" className="status-cell">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr
                      className="order-row is-skeleton"
                      key={`skeleton-${index}`}
                      aria-hidden="true"
                    >
                      <td className="number-cell row-number">
                        <span className="skeleton-line skeleton-line--xs" />
                      </td>
                      <td>
                        <span className="skeleton-line skeleton-line--md" />
                        <span className="skeleton-line skeleton-line--sm" />
                      </td>
                      <td className="customer-name">
                        <span className="skeleton-line skeleton-line--md" />
                        <span className="skeleton-line skeleton-line--sm" />
                      </td>
                      <td>
                        <span className="skeleton-line skeleton-line--md" />
                      </td>
                      <td>
                        <span className="skeleton-line skeleton-line--md" />
                      </td>
                      <td>
                        <span className="skeleton-line skeleton-line--md" />
                        <span className="skeleton-line skeleton-line--sm" />
                      </td>
                      <td className="status-cell">
                        <span className="skeleton-line skeleton-line--pill" />
                      </td>
                    </tr>
                  ))
                ) : (
                  visibleOrders.map((order, index) => (
                  <tr
                    className="order-row"
                    key={order.id}
                    tabIndex={0}
                    aria-label={`Buka detail pesanan ${order.kode_pesanan ?? order.id}`}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('a, button, input, select')) return;
                      openOrder(order.id);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.target !== event.currentTarget ||
                        (event.key !== 'Enter' && event.key !== ' ')
                      ) {
                        return;
                      }
                      event.preventDefault();
                      openOrder(order.id);
                    }}
                  >
                    <td className="number-cell row-number">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td>
                      <Link className="order-id" to={`/owner/orders/${order.id}`}>
                        {order.kode_pesanan ?? `#${order.id}`}
                      </Link>
                      <small className="order-time">{formatOrderDateTime(order.created_at)}</small>
                    </td>
                    <td className="customer-name">
                      {order.nama}
                      <small className="order-time">{order.nomor_telp ?? '—'}</small>
                    </td>
                    <td>
                      <div className="service-cell">
                        <span>
                          {order.layanan?.nama ?? 'Layanan'}
                          {order.jumlah > 1 ? ` × ${order.jumlah}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{formatCurrency(order.total_harga)}</strong>
                      {order.diskon > 0 && (
                        <small className="order-time">Diskon −{formatCurrency(order.diskon)}</small>
                      )}
                    </td>
                    <td>
                      <span>{paymentMethodLabel(order.pembayaran?.metode_pembayaran)}</span>
                      <small className="order-time">
                        {PAYMENT_STATUS_LABELS[order.pembayaran?.status_pembayaran ?? ''] ??
                          'Belum dibayar'}
                      </small>
                    </td>
                    <td className="status-cell">
                      <span className={`status ${STATUS_CLASS[order.status]}`}>
                        {order.status_label}
                      </span>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && visibleOrders.length === 0 && (
              <p className="empty-state">
                {orders.length === 0
                  ? 'Belum ada pesanan. Pesanan pelanggan akan muncul di sini.'
                  : 'Tidak ada pesanan yang cocok.'}
              </p>
            )}
          </div>
          <div className="table-footer">
            <p>
              {loading
                ? 'Memuat pesanan…'
                : visibleOrders.length === 0
                  ? 'Tidak ada pesanan yang ditampilkan'
                  : `Menampilkan ${visibleOrders.length} dari ${orders.length} pesanan`}
            </p>
            <button
              className="reset-button"
              type="button"
              onClick={() => {
                setSearch('');
                setCategory('all');
                setStatus('all');
                setSort('newest');
                searchRef.current?.focus();
              }}
            >
              Atur Ulang Filter
            </button>
          </div>
        </section>
      </main>
    </OwnerShell>
  );
}
