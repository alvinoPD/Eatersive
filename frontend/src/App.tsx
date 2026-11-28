import { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import AuthProvider from './auth/AuthProvider';
import AppRoutes from './routes/AppRoutes';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    /* Instan saat pindah halaman; smooth hanya untuk klik anchor di halaman. */
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
