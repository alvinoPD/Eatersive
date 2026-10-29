import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OwnerShell from '../../components/owner/OwnerShell';
import { OWNER_ORDERS } from '../../data/ownerOrders';
import type { OwnerOrder } from '../../types/eatersive';
import '../../styles/owner-orders.css';

type SortOrder = 'newest' | 'oldest' | 'customer';
type CategoryFilter = 'all' | OwnerOrder['category'];

const STATUS_CLASS: Record<OwnerOrder['status'], string> = {
  Selesai: 'status--done',
  Proses: 'status--process',
};

export default function OwnerOrdersPage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');

  useEffect(() => {
    document.title = 'Kelola Pesanan — EaterSive';
  }, []);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id');
    return OWNER_ORDERS.filter((order) => {
      const matchesCategory = category === 'all' || order.category === category;
      const matchesQuery = `${order.id} ${order.customer} ${order.service} ${order.category}`
        .toLocaleLowerCase('id')
        .includes(query);
      return matchesCategory && matchesQuery;
    }).sort((first, second) => {
      if (sort === 'oldest') return first.sequence - second.sequence;
      if (sort === 'customer') return first.customer.localeCompare(second.customer, 'id');
      return second.sequence - first.sequence;
    });
  }, [category, search, sort]);

  function openOrder(orderId: string) {
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
              <strong>24</strong>
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
              <strong>18</strong>
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
              <strong>4</strong>
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
                placeholder="Cari nama layanan atau kategori..."
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
                {visibleOrders.map((order, index) => (
                  <tr
                    className="order-row"
                    key={order.id}
                    tabIndex={0}
                    aria-label={`Buka detail pesanan ${order.id}, ${order.customer}`}
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
                        {order.id}
                      </Link>
                    </td>
                    <td className="customer-name">{order.customer}</td>
                    <td>
                      <div className="service-cell">
                        <img src={order.serviceImage} alt="" />
                        <span>{order.service}</span>
                      </div>
                    </td>
                    <td>
                      <span className="estimate">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="12" r="8" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                        {order.estimate}
                      </span>
                    </td>
                    <td className="status-cell">
                      <span className={`status ${STATUS_CLASS[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleOrders.length === 0 && (
              <p className="empty-state">Tidak ada pesanan yang cocok.</p>
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
