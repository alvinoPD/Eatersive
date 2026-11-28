import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import RequireAuth from '../auth/RequireAuth';
import RequireRole from '../auth/RequireRole';
import MainLayout from '../layouts/MainLayout';

const AboutPage = lazy(() => import('../pages/AboutPage'));
const ApiStatusPage = lazy(() => import('../pages/ApiStatusPage'));
const CaptchaPreviewPage = lazy(() => import('../pages/CaptchaPreviewPage'));
const HomePage = lazy(() => import('../pages/HomePage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const KonfirmasiPesananPage = lazy(() => import('../pages/user/KonfirmasiPesananPage'));
const LacakPesananPage = lazy(() => import('../pages/user/LacakPesananPage'));
const LandingPage = lazy(() => import('../pages/user/LandingPage'));
const LoginPage = lazy(() => import('../pages/user/LoginPage'));
const NotaPage = lazy(() => import('../pages/user/NotaPage'));
const PembayaranPage = lazy(() => import('../pages/user/PembayaranPage'));
const PesananSayaPage = lazy(() => import('../pages/user/PesananSayaPage'));
const PilihLayananPage = lazy(() => import('../pages/user/PilihLayananPage'));
const RegisterPage = lazy(() => import('../pages/user/RegisterPage'));
const OwnerCatalogPage = lazy(() => import('../pages/owner/OwnerCatalogPage'));
const OwnerDashboardPage = lazy(() => import('../pages/owner/OwnerDashboardPage'));
const OwnerMembersPage = lazy(() => import('../pages/owner/OwnerMembersPage'));
const OwnerOrderDetailPage = lazy(() => import('../pages/owner/OwnerOrderDetailPage'));
const OwnerOrdersPage = lazy(() => import('../pages/owner/OwnerOrdersPage'));
const OwnerReviewsPage = lazy(() => import('../pages/owner/OwnerReviewsPage'));
const OwnerSettingsPage = lazy(() => import('../pages/owner/OwnerSettingsPage'));

function RouteFallback() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading__spinner" aria-hidden="true" />
      <span>Memuat halaman…</span>
    </div>
  );
}

/**
 * Daftar route frontend.
 * - publik: landing, login, register, katalog layanan
 * - customer (login): pembayaran, konfirmasi, lacak, pesanan saya, nota
 * - owner (admin): dashboard, pesanan, katalog, member, review, pengaturan
 *
 * Setiap halaman di-lazy-load supaya bundle awal hanya berisi halaman yang
 * sedang dibuka.
 */
export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/captcha-preview" element={<CaptchaPreviewPage />} />
        <Route path="/layanan" element={<PilihLayananPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/pembayaran" element={<PembayaranPage />} />
          <Route path="/konfirmasi-pesanan" element={<KonfirmasiPesananPage />} />
          <Route path="/lacak-pesanan" element={<LacakPesananPage />} />
          <Route path="/pesanan-saya" element={<PesananSayaPage />} />
          <Route path="/nota/:orderId" element={<NotaPage />} />
        </Route>

        <Route element={<RequireRole role="owner" />}>
          <Route path="/owner" element={<OwnerDashboardPage />} />
          <Route path="/owner/orders" element={<OwnerOrdersPage />} />
          <Route path="/owner/orders/:orderId" element={<OwnerOrderDetailPage />} />
          <Route path="/owner/catalog" element={<OwnerCatalogPage />} />
          <Route path="/owner/members" element={<OwnerMembersPage />} />
          <Route path="/owner/reviews" element={<OwnerReviewsPage />} />
          <Route path="/owner/settings" element={<OwnerSettingsPage />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route path="template" element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="api-status" element={<ApiStatusPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
