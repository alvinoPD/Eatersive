import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OwnerShell from '../../components/owner/OwnerShell';
import { getApiErrorMessage } from '../../api/client';
import { fetchOwnerOrders, type Order } from '../../api/orders';
import { FALLBACK_IMAGE } from '../../api/layanan';
import '../../styles/owner-orders.css';

type SortOrder = 'newest' | 'oldest' | 'customer';
type CategoryFilter = 'all' | 'Cleaning' | 'Treatment' | 'Repair' | 'Unyellowing';

/** Status yang masih dikerjakan (belum selesai/dibatalkan). */
const ACTIVE_STATUSES = ['pending', 'confirmed', 'processing', 'quality_check'];

export default function OwnerOrdersPage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
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
        if (!alive) return;
        setError(getApiErrorMessage(fetchError));
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
        const haystack = `${order.kode_pesanan ?? ''} ${order.nama} ${order.layanan?.nama ?? ''} ${serviceCategory}`;
        const matchesQuery = haystack.toLocaleLowerCase('id').includes(query);

        return matchesCategory && matchesQuery;
      })
      .sort((first, second) => {
        if (sort === 'customer') return first.nama.localeCompare(second.nama, 'id');
        if (sort === 'oldest') return first.id - second.id;
        return second.id - first.id;
      });
  }, [category, orders, search, sort]);

  const totalOrders = orders.length;
  const processOrders = orders.filter((order) =>
    ACTIVE_STATUSES.includes(order.status),
  ).length;
  const doneOrders = orders.filter((order) => order.status === 'completed').length;

  function openOrder(orderId: number) {
    navigate(`/owner/orders/${orderId}`);
  }

  return (
    <OwnerShell
      pageId="page-owner-orders"
      shellClassName="orders-shell"
      activeNav="orders"
    >
      <main className="orders-content">
        <section className="page-heading" aria-labelledby="page-title">
          <h1 id="page-title">Kelola Pesanan</h1>
          <p>Atur daftar layanan cuci, perbaikan, dan perawatan sepatu Anda.</p>
        </section>

        <section className="summary-grid" aria-label="Ringkasan pesanan">
          <article className="summary-card summary-card--total">
            <span className="summary-icon summary-icon--blue" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
                <path d="m4.2 7.6 7.8 4.5 7.8-4.5M12 12v9" />
              </svg>
            </span>
            <div>
              <p>Total Pesanan</p>
              <strong>{loading ? '—' : totalOrders}</strong>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon--orange" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <div>
              <p>Proses</p>
              <strong>{loading ? '—' : processOrders}</strong>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon--green" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
                <path d="m8.5 12 2.3 2.3 4.8-5" />
              </svg>
            </span>
            <div>
              <p>Selesai</p>
              <strong>{loading ? '—' : doneOrders}</strong>
            </div>
          </article>
        </section>

        <section className="orders-panel" aria-label="Daftar pesanan">
          <div className="table-toolbar">
            <label className="search-field">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.3" />
                <path d="m16 16 4 4" />
              </svg>
              <span className="visually-hidden">Cari nama layanan atau kategori</span>
              <input
                ref={searchRef}
                type="search"
                placeholder="Cari kode pesanan, nama, atau layanan..."
                autoComplete="off"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="select-field select-field--category">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5h16l-6.2 7.2V19l-3.6-1.8v-5L4 5Z" />
              </svg>
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
              <span className="select-chevron" aria-hidden="true">
                ⌄
              </span>
            </label>
            <label className="select-field select-field--sort">
              <span className="visually-hidden">Urutkan pesanan</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOrder)}
              >
                <option value="newest">Urutkan: Terbaru</option>
                <option value="oldest">Urutkan: Terlama</option>
                <option value="customer">Urutkan: Nama A–Z</option>
              </select>
              <span className="select-chevron" aria-hidden="true">
                ⌄
              </span>
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
                  <th scope="col">Nama Pelanggan</th>
                  <th scope="col">Layanan</th>
                  <th scope="col">Estimasi</th>
                  <th scope="col" className="status-cell">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  !error &&
                  visibleOrders.map((order, index) => (
                    <tr
                      className="order-row"
                      key={order.id}
                      tabIndex={0}
                      aria-label={`Buka detail pesanan ${order.kode_pesanan ?? order.id}, ${order.nama}`}
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest('a, button, input, select')) {
                          return;
                        }
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
                      </td>
                      <td className="customer-name">{order.nama}</td>
                      <td>
                        <div className="service-cell">
                          <img
                            src={order.layanan?.foto || FALLBACK_IMAGE}
                            alt=""
                            loading="lazy"
                          />
                          <span>{order.layanan?.nama ?? '—'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="estimate">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="8" />
                            <path d="M12 7v5l3 2" />
                          </svg>
                          {order.layanan?.estimasi ?? '—'}
                        </span>
                      </td>
                      <td className="status-cell">
                        <span
                          className={`status ${
                            order.status === 'completed'
                              ? 'status--done'
                              : order.status === 'cancelled'
                                ? 'status--cancelled'
                                : 'status--process'
                          }`}
                        >
                          {order.status_label}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {loading && <p className="empty-state">Memuat pesanan dari server…</p>}

            {!loading && error && (
              <p className="empty-state" role="alert">
                {error}
              </p>
            )}

            {!loading && !error && visibleOrders.length === 0 && (
              <p className="empty-state">
                {orders.length === 0
                  ? 'Belum ada pesanan. Pesanan pelanggan akan muncul di sini.'
                  : 'Tidak ada pesanan yang cocok.'}
              </p>
            )}
          </div>
          <div className="table-footer">
            <p>
              {visibleOrders.length === 0
                ? 'Tidak ada pesanan yang ditampilkan'
                : `Menampilkan ${visibleOrders.length} pesanan`}
            </p>
            <button
              className="reset-button"
              type="button"
              onClick={() => {
                setSearch('');
                setCategory('all');
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
