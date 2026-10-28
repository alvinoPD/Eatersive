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

const CHART_DATA = {
  revenue: {
    title: 'Grafik pendapatan per bulan',
    description: 'Visualisasi pertumbuhan bisnis 6 bulan terakhir.',
    legend: 'Pendapatan (Rp)',
    path: 'M0 162 C42 166 75 172 112 168 S198 138 250 128 S337 106 388 93 S475 77 512 88 S567 104 600 117',
    labels: ['Rp14.0jt', 'Rp10.5jt', 'Rp7.0jt', 'Rp3.5jt', 'Rp0.0jt'],
  },
  orders: {
    title: 'Grafik jumlah pesanan per bulan',
    description: 'Perbandingan jumlah pesanan dalam 6 bulan terakhir.',
    legend: 'Jumlah pesanan',
    path: 'M0 175 C42 158 77 170 112 145 S195 150 250 116 S335 136 388 92 S474 105 512 74 S569 87 600 55',
    labels: ['180 pesanan', '135 pesanan', '90 pesanan', '45 pesanan', '0 pesanan'],
  },
} satisfies Record<ChartType, { title: string; description: string; legend: string; path: string; labels: string[] }>;

const STATUS_CLASS: Record<(typeof DASHBOARD_RECENT_ORDERS)[number]['status'], string> = {
  proses: 'status--process',
  selesai: 'status--done',
  menunggu: 'status--waiting',
  dibatalkan: 'status--cancelled',
};

const SERVICE_SUMMARY = [
  { name: 'Deep Cleaning', units: '84 unit', width: '64%' },
  { name: 'Unyellowing', units: '48 unit', width: '42%' },
  { name: 'Repair & Reglue', units: '32 unit', width: '29%' },
  { name: 'Other Services', units: '12 unit', width: '15%' },
];

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
              <strong>Rp 12.450.000</strong>
              <span>vs. bulan lalu</span>
            </div>
            <span className="trend trend--up">↗ +12,5%</span>
            <svg
              className="sparkline"
              viewBox="0 0 240 78"
              preserveAspectRatio="none"
              aria-label="Grafik pendapatan meningkat"
            >
              <defs>
                <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#2862ed" stopOpacity=".3" />
                  <stop offset="1" stopColor="#2862ed" stopOpacity=".03" />
                </linearGradient>
              </defs>
              <path
                d="M0 49 C30 50 42 57 66 49 S112 37 135 30 S178 14 195 17 S222 25 240 21 V78 H0Z"
                fill="url(#spark-fill)"
              />
              <path
                d="M0 49 C30 50 42 57 66 49 S112 37 135 30 S178 14 195 17 S222 25 240 21"
                fill="none"
                stroke="#2862ed"
                strokeWidth="2"
              />
            </svg>
          </article>
          <article className="metric-card">
            <div className="metric-icon metric-icon--blue" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M4 9h16m-11 4 3 3 3-3" />
              </svg>
            </div>
            <span className="trend trend--up">↗ +8,2%</span>
            <div className="metric-copy">
              <p>Pesanan Baru</p>
              <strong>142</strong>
              <span>vs. minggu lalu</span>
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-icon metric-icon--blue" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M16 20v-1.7a3.3 3.3 0 0 0-3.3-3.3H6.3A3.3 3.3 0 0 0 3 18.3V20m6.5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6-6.7a3.5 3.5 0 0 1 0 6.8m2 3.6a3.3 3.3 0 0 1 3.5 3.3V20" />
              </svg>
            </div>
            <span className="trend trend--up">↗ +5,1%</span>
            <div className="metric-copy">
              <p>Pelanggan Aktif</p>
              <strong>856</strong>
              <span>total pelanggan</span>
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
                <div className="chart-y-labels" aria-hidden="true">
                  {chart.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                <svg
                  className="analytics-chart"
                  viewBox="0 0 600 250"
                  preserveAspectRatio="none"
                  role="img"
                  aria-labelledby="chart-title chart-description"
                >
                  <title id="chart-title">{chart.title}</title>
                  <defs>
                    <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#2862ed" stopOpacity=".32" />
                      <stop offset="1" stopColor="#2862ed" stopOpacity=".06" />
                    </linearGradient>
                  </defs>
                  <path className="chart-area" d={`${chart.path} V250 H0Z`} />
                  <path className="chart-line" d={chart.path} />
                </svg>
              </div>
              <div className="chart-x-labels" aria-hidden="true">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>Mei</span>
                <span>Jun</span>
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
                  <p className="empty-state">Tidak ada pesanan yang cocok.</p>
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
                {SERVICE_SUMMARY.map((service) => (
                  <li key={service.name}>
                    <div className="service-meta">
                      <span>{service.name}</span>
                      <span>{service.units}</span>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: service.width }} />
                    </div>
                  </li>
                ))}
              </ul>
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
                  <small>Sedang padat • 12 antrean</small>
                </div>
                <span className="operation-badge operation-badge--orange">Sibuk</span>
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
