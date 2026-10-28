import { Route, Routes } from 'react-router-dom';
import RequireRole from '../auth/RequireRole';
import MainLayout from '../layouts/MainLayout';
import AboutPage from '../pages/AboutPage';
import ApiStatusPage from '../pages/ApiStatusPage';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import KonfirmasiPesananPage from '../pages/user/KonfirmasiPesananPage';
import LacakPesananPage from '../pages/user/LacakPesananPage';
import LandingPage from '../pages/user/LandingPage';
import LoginPage from '../pages/user/LoginPage';
import PembayaranPage from '../pages/user/PembayaranPage';
import PilihLayananPage from '../pages/user/PilihLayananPage';
import OwnerCatalogPage from '../pages/owner/OwnerCatalogPage';
import OwnerDashboardPage from '../pages/owner/OwnerDashboardPage';
import OwnerOrderDetailPage from '../pages/owner/OwnerOrderDetailPage';
import OwnerOrdersPage from '../pages/owner/OwnerOrdersPage';
import OwnerReviewsPage from '../pages/owner/OwnerReviewsPage';

/**
 * Daftar route frontend. Halaman user dan owner dipisahkan berdasarkan prefix:
 * - user: /, /login, /layanan, /pembayaran, /konfirmasi-pesanan, /lacak-pesanan
 * - owner: /owner, /owner/orders, /owner/catalog, /owner/reviews (butuh login owner)
 *
 * Halaman template lama tetap tersedia di /template, /about, dan /api-status.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/layanan" element={<PilihLayananPage />} />
      <Route path="/pembayaran" element={<PembayaranPage />} />
      <Route path="/konfirmasi-pesanan" element={<KonfirmasiPesananPage />} />
      <Route path="/lacak-pesanan" element={<LacakPesananPage />} />

      <Route element={<RequireRole role="owner" />}>
        <Route path="/owner" element={<OwnerDashboardPage />} />
        <Route path="/owner/orders" element={<OwnerOrdersPage />} />
        <Route path="/owner/orders/:orderId" element={<OwnerOrderDetailPage />} />
        <Route path="/owner/catalog" element={<OwnerCatalogPage />} />
        <Route path="/owner/reviews" element={<OwnerReviewsPage />} />
      </Route>

      <Route element={<MainLayout />}>
        <Route path="template" element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="api-status" element={<ApiStatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
