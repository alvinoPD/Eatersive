import { Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AboutPage from '../pages/AboutPage';
import ApiStatusPage from '../pages/ApiStatusPage';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';

/**
 * Daftar route frontend. Semua route dirender oleh React, bukan Laravel.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="api-status" element={<ApiStatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
