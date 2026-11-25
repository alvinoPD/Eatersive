import { Route, Routes } from 'react-router-dom';
import RequireAuth from '../auth/RequireAuth';
import RequireRole from '../auth/RequireRole';
import MainLayout from '../layouts/MainLayout';
import AboutPage from '../pages/AboutPage';
import ApiStatusPage from '../pages/ApiStatusPage';
import CaptchaPreviewPage from '../pages/CaptchaPreviewPage';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import KonfirmasiPesananPage from '../pages/user/KonfirmasiPesananPage';
import LacakPesananPage from '../pages/user/LacakPesananPage';
import LandingPage from '../pages/user/LandingPage';
import LoginPage from '../pages/user/LoginPage';
import NotaPage from '../pages/user/NotaPage';
import PembayaranPage from '../pages/user/PembayaranPage';
import PesananSayaPage from '../pages/user/PesananSayaPage';
import PilihLayananPage from '../pages/user/PilihLayananPage';
import RegisterPage from '../pages/user/RegisterPage';
import OwnerCatalogPage from '../pages/owner/OwnerCatalogPage';
import OwnerDashboardPage from '../pages/owner/OwnerDashboardPage';
import OwnerMembersPage from '../pages/owner/OwnerMembersPage';
import OwnerOrderDetailPage from '../pages/owner/OwnerOrderDetailPage';
import OwnerOrdersPage from '../pages/owner/OwnerOrdersPage';
import OwnerReviewsPage from '../pages/owner/OwnerReviewsPage';
import OwnerSettingsPage from '../pages/owner/OwnerSettingsPage';

/**
 * Daftar route frontend.
 * - publik: landing, login, register, katalog layanan
 * - customer (login): pembayaran, konfirmasi, lacak, pesanan saya, nota
 * - owner (admin): dashboard, pesanan, katalog, member, review, pengaturan
 */
export default function AppRoutes() {
  return (
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
  );
}
