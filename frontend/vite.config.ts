import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  /*
   * Vite menanam VITE_API_BASE_URL ke bundle saat build. Tanpa nilai ini aplikasi
   * melempar error di browser dan halaman jadi putih, jadi build dibatalkan lebih awal.
   */
  if (command === 'build' && !env.VITE_API_BASE_URL) {
    throw new Error(
      'VITE_API_BASE_URL kosong saat build. Isi frontend/.env.production, ' +
        'contoh: VITE_API_BASE_URL=https://api.eatersive.store/api/v1',
    )
  }

  return {
    plugins: [react()],
    server: {
      // Port dev server frontend, harus berbeda dari backend (8000).
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
  }
})
