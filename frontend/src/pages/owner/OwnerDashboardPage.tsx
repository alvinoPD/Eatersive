import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import OwnerShell, { OwnerFooter } from '../../components/owner/OwnerShell';
import { DASHBOARD_RECENT_ORDERS } from '../../data/ownerOrders';
import { formatCurrency } from '../../lib/checkout';
import '../../styles/owner-dashboard.css';

type ChartType = 'revenue' | 'orders';
type StatusFilter = 'all' | 'proses' | 'selesai' | 'menunggu' | 'dibatalkan';

const PERIODS = [
  { value: 'sep-2026', label: 'Sep 2026' },
  { value: 'agu-2026', label: 'Agu 2026' },
  { value: 'jul-2026', label: 'Jul 2026' },
];

/**
 * Metadata grafik. Data contoh (deret angka dan kurva) sudah dihapus, jadi
 * grafik hanya menampilkan keadaan kosong sampai angka asli tersedia.
 */
const CHART_DATA = {
  revenue: {
    title: 'Grafik pendapatan per bulan',
    description: 'Visualisasi pertumbuhan bisnis 6 bulan terakhir.',
    legend: 'Pendapatan (Rp)',
  },
  orders: {
    title: 'Grafik jumlah pesanan per bulan',
    description: 'Perbandingan jumlah pesanan dalam 6 bulan terakhir.',
    legend: 'Jumlah pesanan',
  },
} satisfies Record<ChartType, { title: string; description: string; legend: string }>;

const STATUS_CLASS: Record<(typeof DASHBOARD_RECENT_ORDERS)[number]['status'], string> = {
  proses: 'status--process',
  selesai: 'status--done',
  menunggu: 'status--waiting',
  dibatalkan: 'status--cancelled',
};


export default function OwnerDashboardPage() {
  const [chartType, setChartType] = useState<ChartType>('revenue');
  const [chartDescription, setChartDescription] = useState(CHART_DATA.revenue.description);
  const [period, setPeriod] = useState('sep-2026');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    document.title = 'Dashboard Pemilik — EaterSive';
  }, []);

  const chart = CHART_DATA[chartType];

  const totalRevenue = DASHBOARD_RECENT_ORDERS.reduce((sum, order) => sum + order.total, 0);
  const newOrders = DASHBOARD_RECENT_ORDERS.length;
  const activeCustomers = new Set(DASHBOARD_RECENT_ORDERS.map((order) => order.customer)).size;
  const queueCount = DASHBOARD_RECENT_ORDERS.filter((order) => order.status === 'proses').length;

  const serviceSummary = useMemo(() => {
    const counts = new Map<string, number>();
    DASHBOARD_RECENT_ORDERS.forEach((order) => {
      counts.set(order.service, (counts.get(order.service) ?? 0) + 1);
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
  }, []);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id');
    return DASHBOARD_RECENT_ORDERS.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const haystack = `${order.id} ${order.customer} ${order.service} ${order.statusLabel}`.toLocaleLowerCase(
        'id',
      );
      return matchesStatus && haystack.includes(query);
    });
  }, [search, statusFilter]);

  function selectChart(nextType: ChartType) {
    setChartType(nextType);
    setChartDescription(CHART_DATA[nextType].description);
  }

  function changePeriod(value: string) {
    setPeriod(value);
    const label = PERIODS.find((option) => option.value === value)?.label ?? value;
    setChartDescription(
      `Visualisasi pertumbuhan bisnis 6 bulan terakhir hingga ${label}.`,
    );
  }

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
            <p>Berikut adalah ringkasan performa toko Anda hari ini.</p>
          </div>
          <label className="period-select">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="6" width="16" height="15" rx="2" />
              <path d="M8 3v6m8-6v6M4 11h16" />
            </svg>
            <span className="visually-hidden">Pilih periode</span>
            <select
              aria-label="Pilih periode"
              value={period}
              onChange={(event) => changePeriod(event.target.value)}
            >
              {PERIODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="select-chevron" aria-hidden="true">
              ⌄
            </span>
          </label>
        </section>

        <section className="metrics-grid" aria-label="Ringkasan metrik">
          <article className="metric-card metric-card--revenue">
            <div className="metric-icon metric-icon--blue" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 5h14v14H5z" />
                <path d="M8 15h2l2-4 2 3 2-2" />
              </svg>
            </div>
            <div className="metric-copy">
              <p>Total Pendapatan</p>
              <strong>{formatCurrency(totalRevenue)}</strong>
              <span>dari pesanan terbaru</span>
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-icon metric-icon--blue" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M4 9h16m-11 4 3 3 3-3" />
              </svg>
            </div>
            <div className="metric-copy">
              <p>Pesanan Baru</p>
              <strong>{newOrders}</strong>
              <span>pesanan terbaru</span>
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-icon metric-icon--blue" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M16 20v-1.7a3.3 3.3 0 0 0-3.3-3.3H6.3A3.3 3.3 0 0 0 3 18.3V20m6.5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6-6.7a3.5 3.5 0 0 1 0 6.8m2 3.6a3.3 3.3 0 0 1 3.5 3.3V20" />
              </svg>
            </div>
            <div className="metric-copy">
              <p>Pelanggan Aktif</p>
              <strong>{activeCustomers}</strong>
              <span>dari pesanan terbaru</span>
            </div>
          </article>
        </section>

        <div className="dashboard-grid">
          <div className="main-column">
            <section className="panel analytics-panel" aria-labelledby="analytics-title">
              <div className="panel-heading">
                <div>
                  <h2 id="analytics-title">Analistik</h2>
                  <p id="chart-description">{chartDescription}</p>
                </div>
                <div className="chart-tabs" role="group" aria-label="Data grafik">
                  <button
                    className={`chart-tab${chartType === 'revenue' ? ' is-active' : ''}`}
                    type="button"
                    aria-pressed={chartType === 'revenue'}
                    onClick={() => selectChart('revenue')}
                  >
                    Pendapatan
                  </button>
                  <button
                    className={`chart-tab${chartType === 'orders' ? ' is-active' : ''}`}
                    type="button"
                    aria-pressed={chartType === 'orders'}
                    onClick={() => selectChart('orders')}
                  >
                    Pesanan
                  </button>
                </div>
              </div>
              <div className="chart-wrap">
                <p className="empty-state">
                  {chart.title} belum dapat ditampilkan karena belum ada data{' '}
                  {chartType === 'revenue' ? 'pendapatan' : 'pesanan'}.
                </p>
              </div>
              <p className="chart-legend">
                <span />
                <span>{chart.legend}</span>
              </p>
            </section>

            <section className="panel orders-panel" id="pesanan" aria-labelledby="orders-title">
              <div className="panel-heading orders-heading">
                <div>
                  <h2 id="orders-title">Pesanan Terbaru</h2>
                  <p>Daftar 5 aktivitas pesanan terakhir yang masuk ke sistem.</p>
                </div>
                <Link className="text-link" to="/owner/orders">
                  Lihat Semua <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className="table-tools">
                <label className="search-field">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="10.8" cy="10.8" r="6.3" />
                    <path d="m16 16 4 4" />
                  </svg>
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
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 5h16l-6.2 7.2V19l-3.6-1.8v-5L4 5Z" />
                  </svg>
                  <span className="visually-hidden">Filter status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                  >
                    <option value="all">Filter Status</option>
                    <option value="proses">Diproses</option>
                    <option value="selesai">Selesai</option>
                    <option value="menunggu">Menunggu</option>
                    <option value="dibatalkan">Dibatalkan</option>
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
                        <td className="order-id">{order.id}</td>
                        <td>{order.customer}</td>
                        <td>{order.service}</td>
                        <td>
                          <span className={`status ${STATUS_CLASS[order.status]}`}>
                            {order.statusLabel}
                          </span>
                        </td>
                        <td className="amount-cell">{formatCurrency(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleOrders.length === 0 && (
                  <p className="empty-state">
                    {DASHBOARD_RECENT_ORDERS.length === 0
                      ? 'Belum ada pesanan. Ringkasan akan muncul setelah pesanan masuk.'
                      : 'Tidak ada pesanan yang cocok.'}
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="side-column" aria-label="Ringkasan operasional">
            <section className="panel services-panel" id="layanan" aria-labelledby="services-title">
              <div className="panel-heading panel-heading--compact">
                <div>
                  <h2 id="services-title">Ringkasan Layanan</h2>
                  <p>Layanan paling banyak dipesan bulan ini.</p>
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
                <p className="empty-state">Belum ada layanan yang dipesan bulan ini.</p>
              )}
              <Link className="outline-button" to="/owner/catalog">
                Analitik Detail Layanan
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
                    {queueCount > 0 ? `${queueCount} antrean` : 'Belum ada antrean'}
                  </small>
                </div>
                <span className="operation-badge operation-badge--orange">
                  {queueCount > 0 ? 'Sibuk' : 'Kosong'}
                </span>
              </div>
            </section>

            <section className="help-card" id="ulasan">
              <span className="help-spark" aria-hidden="true">
                ✦
              </span>
              <h2>Butuh Bantuan?</h2>
              <p>
                Hubungi tim support SoleCare jika Anda mengalami kendala pada sistem dashboard.
              </p>
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
