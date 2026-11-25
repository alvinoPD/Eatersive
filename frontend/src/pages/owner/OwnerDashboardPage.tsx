import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import OwnerShell, { OwnerFooter } from '../../components/owner/OwnerShell';
import ImageCarousel from '../../components/shared/ImageCarousel';
import { getApiErrorMessage } from '../../api/client';
import {
  fetchOwnerDashboard,
  type OwnerDashboardSummary,
} from '../../api/owner';
import { formatCurrency } from '../../lib/checkout';
import type { OrderStatus } from '../../api/orders';
import '../../styles/owner-dashboard.css';

type ChartType = 'revenue' | 'orders';
type StatusFilter = 'all' | OrderStatus;

const STATUS_CLASS: Record<string, string> = {
  pending: 'status--waiting',
  confirmed: 'status--process',
  processing: 'status--process',
  quality_check: 'status--process',
  completed: 'status--done',
  cancelled: 'status--cancelled',
};

const EMPTY: OwnerDashboardSummary = {
  total_orders: 0,
  pending_orders: 0,
  confirmed_orders: 0,
  processing_orders: 0,
  quality_check_orders: 0,
  completed_orders: 0,
  cancelled_orders: 0,
  total_revenue: 0,
  total_discount: 0,
  member_count: 0,
  active_customers: 0,
  queue_count: 0,
  recent_orders: [],
  recent_photos: [],
  monthly: [],
};

export default function OwnerDashboardPage() {
  const [summary, setSummary] = useState<OwnerDashboardSummary>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState<ChartType>('revenue');
  const [months, setMonths] = useState(6);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    document.title = 'Dashboard Pemilik — EaterSive';
  }, []);

  useEffect(() => {
    let alive = true;

    fetchOwnerDashboard()
      .then((data) => {
        if (!alive) return;
        setSummary(data);
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

  const chartRows = useMemo(
    () => summary.monthly.slice(-months),
    [months, summary.monthly],
  );

  const chartMax = Math.max(
    1,
    ...chartRows.map((row) => (chartType === 'revenue' ? row.revenue : row.orders)),
  );

  const serviceSummary = useMemo(() => {
    const counts = new Map<string, number>();
    summary.recent_orders.forEach((order) => {
      const name = order.layanan ?? 'Layanan';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    const rows = [...counts.entries()]
      .map(([name, units]) => ({ name, units }))
      .sort((first, second) => second.units - first.units);
    const maxUnits = rows[0]?.units ?? 0;

    return rows.map((row) => ({
      ...row,
      unitsLabel: `${row.units} unit`,
      width: maxUnits > 0 ? `${Math.round((row.units / maxUnits) * 100)}%` : '0%',
    }));
  }, [summary.recent_orders]);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id');

    return summary.recent_orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const haystack =
        `${order.kode_pesanan ?? ''} ${order.nama} ${order.layanan ?? ''} ${order.status_label}`.toLocaleLowerCase(
          'id',
        );
      return matchesStatus && haystack.includes(query);
    });
  }, [search, statusFilter, summary.recent_orders]);

  const gallery = summary.recent_photos
    .filter((photo) => Boolean(photo.url))
    .map((photo) => ({
      src: photo.url,
      alt: `Foto sepatu ${photo.sisi} ${photo.kode_pesanan ?? ''}`,
      caption: photo.kode_pesanan ?? photo.sisi,
    }));

  return (
    <OwnerShell
      pageId="page-owner-dashboard"
      shellClassName="dashboard-shell"
      activeNav="dashboard"
      footer={<OwnerFooter />}
    >
      <main className="dashboard-content" id="dashboard">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Ringkasan bisnis</p>
            <h1 id="page-title">Halo, Admin EaterSive</h1>
            <p>Berikut ringkasan performa toko Anda hari ini, langsung dari database.</p>
          </div>
          <label className="period-select">
            <span className="visually-hidden">Pilih periode grafik</span>
            <select
              aria-label="Pilih periode grafik"
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
            >
              <option value={3}>3 bulan terakhir</option>
              <option value={6}>6 bulan terakhir</option>
            </select>
          </label>
        </section>

        {error && (
          <p className="page-error" role="alert">
            {error}
          </p>
        )}

        <section className="metrics-grid" aria-label="Ringkasan metrik">
          <article className="metric-card metric-card--revenue">
            <div className="metric-copy">
              <p>Total Pendapatan</p>
              <strong>{loading ? '—' : formatCurrency(summary.total_revenue)}</strong>
              <span>dari pembayaran lunas</span>
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-copy">
              <p>Pesanan Baru</p>
              <strong>{loading ? '—' : summary.pending_orders}</strong>
              <span>menunggu konfirmasi</span>
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-copy">
              <p>Pelanggan Aktif</p>
              <strong>{loading ? '—' : summary.active_customers}</strong>
              <span>{summary.member_count} member aktif</span>
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-copy">
              <p>Total Diskon Member</p>
              <strong>{loading ? '—' : formatCurrency(summary.total_discount)}</strong>
              <span>akumulasi semua pesanan</span>
            </div>
          </article>
        </section>

        <div className="dashboard-grid">
          <div className="main-column">
            <section className="panel analytics-panel" aria-labelledby="analytics-title">
              <div className="panel-heading">
                <div>
                  <h2 id="analytics-title">Analitik</h2>
                  <p>Data {months} bulan terakhir.</p>
                </div>
                <div className="chart-tabs" role="group" aria-label="Data grafik">
                  <button
                    className={`chart-tab${chartType === 'revenue' ? ' is-active' : ''}`}
                    type="button"
                    aria-pressed={chartType === 'revenue'}
                    onClick={() => setChartType('revenue')}
                  >
                    Pendapatan
                  </button>
                  <button
                    className={`chart-tab${chartType === 'orders' ? ' is-active' : ''}`}
                    type="button"
                    aria-pressed={chartType === 'orders'}
                    onClick={() => setChartType('orders')}
                  >
                    Pesanan
                  </button>
                </div>
              </div>

              {chartRows.some((row) => (chartType === 'revenue' ? row.revenue : row.orders) > 0) ? (
                <div className="chart-bars" role="img" aria-label="Grafik bulanan">
                  {chartRows.map((row) => {
                    const value = chartType === 'revenue' ? row.revenue : row.orders;
                    return (
                      <div className="chart-bar" key={row.month}>
                        <strong>
                          {chartType === 'revenue'
                            ? formatCurrency(value)
                            : `${value} pesanan`}
                        </strong>
                        <span
                          className="chart-bar-fill"
                          style={{ height: `${Math.max(4, (value / chartMax) * 100)}%` }}
                        />
                        <small>{row.label}</small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-state">
                  Belum ada data {chartType === 'revenue' ? 'pendapatan' : 'pesanan'} pada periode
                  ini.
                </p>
              )}
            </section>

            <section className="panel orders-panel" id="pesanan" aria-labelledby="orders-title">
              <div className="panel-heading orders-heading">
                <div>
                  <h2 id="orders-title">Pesanan Terbaru</h2>
                  <p>5 aktivitas pesanan terakhir yang masuk ke sistem.</p>
                </div>
                <Link className="text-link" to="/owner/orders">
                  Lihat Semua <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className="table-tools">
                <label className="search-field">
                  <span className="visually-hidden">Cari pesanan atau pelanggan</span>
                  <input
                    type="search"
                    placeholder="Cari pesanan atau pelanggan..."
                    autoComplete="off"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <label className="filter-field">
                  <span className="visually-hidden">Filter status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
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
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">ID Pesanan</th>
                      <th scope="col">Pelanggan</th>
                      <th scope="col">Layanan</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="amount-cell">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="order-id">
                          <Link to={`/owner/orders/${order.id}`}>
                            {order.kode_pesanan ?? `#${order.id}`}
                          </Link>
                        </td>
                        <td>{order.nama}</td>
                        <td>{order.layanan ?? 'Layanan'}</td>
                        <td>
                          <span className={`status ${STATUS_CLASS[order.status] ?? ''}`}>
                            {order.status_label}
                          </span>
                        </td>
                        <td className="amount-cell">{formatCurrency(order.total_harga)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleOrders.length === 0 && (
                  <p className="empty-state">
                    {summary.recent_orders.length === 0
                      ? 'Belum ada pesanan. Ringkasan akan muncul setelah pesanan masuk.'
                      : 'Tidak ada pesanan yang cocok.'}
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="side-column" aria-label="Ringkasan operasional">
            <section className="panel gallery-panel" aria-labelledby="gallery-title">
              <div className="panel-heading panel-heading--compact">
                <div>
                  <h2 id="gallery-title">Galeri Foto Barang</h2>
                  <p>Foto sepatu terbaru dari pelanggan.</p>
                </div>
              </div>
              {gallery.length > 0 ? (
                <ImageCarousel
                  images={gallery}
                  className="dashboard-gallery"
                  autoPlay
                  ariaLabel="Galeri foto sepatu pelanggan"
                />
              ) : (
                <p className="empty-state">Belum ada foto barang yang diunggah.</p>
              )}
            </section>

            <section className="panel services-panel" id="layanan" aria-labelledby="services-title">
              <div className="panel-heading panel-heading--compact">
                <div>
                  <h2 id="services-title">Ringkasan Layanan</h2>
                  <p>Layanan paling banyak dipesan dari pesanan terbaru.</p>
                </div>
              </div>
              <ul className="service-list">
                {serviceSummary.map((service) => (
                  <li key={service.name}>
                    <div className="service-meta">
                      <span>{service.name}</span>
                      <span>{service.unitsLabel}</span>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: service.width }} />
                    </div>
                  </li>
                ))}
              </ul>
              {serviceSummary.length === 0 && (
                <p className="empty-state">Belum ada layanan yang dipesan.</p>
              )}
              <Link className="outline-button" to="/owner/catalog">
                Kelola Katalog
              </Link>
            </section>

            <section className="operations" aria-labelledby="operations-title">
              <h2 id="operations-title">Status Operasional</h2>
              <div className="operation-card">
                <span className="operation-dot operation-dot--green" aria-hidden="true" />
                <div>
                  <strong>Penerimaan Pesanan</strong>
                  <small>Aktif • Toko buka</small>
                </div>
                <span className="operation-badge operation-badge--green">Online</span>
              </div>
              <div className="operation-card">
                <span className="operation-dot operation-dot--orange" aria-hidden="true" />
                <div>
                  <strong>Antrean Pengerjaan</strong>
                  <small>
                    {summary.queue_count > 0
                      ? `${summary.queue_count} antrean`
                      : 'Belum ada antrean'}
                  </small>
                </div>
                <span className="operation-badge operation-badge--orange">
                  {summary.queue_count > 0 ? 'Sibuk' : 'Kosong'}
                </span>
              </div>
            </section>

            <section className="help-card" id="ulasan">
              <span className="help-spark" aria-hidden="true">
                ✦
              </span>
              <h2>Butuh Bantuan?</h2>
              <p>Hubungi tim support EaterSive jika Anda mengalami kendala pada dashboard.</p>
              <a href="mailto:halo@eatersive.id">
                Pusat Bantuan <span aria-hidden="true">↗</span>
              </a>
            </section>
          </aside>
        </div>
      </main>
    </OwnerShell>
  );
}
