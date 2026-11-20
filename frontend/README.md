# Frontend — React + TypeScript + Vite

Frontend untuk template **Laravel + React TypeScript**. Dokumentasi lengkap ada di [`../README.md`](../README.md). Struktur halaman EaterSive, peta route, dan login demo dijelaskan di [`STRUCTURE.md`](./STRUCTURE.md).

## Menjalankan

```bash
npm install
cp .env.example .env
npm run dev
```

Dev server: `http://localhost:5173`.

## Script

| Perintah | Keterangan |
| --- | --- |
| `npm run dev` | Menjalankan Vite dev server |
| `npm run build` | Typecheck (`tsc -b`) lalu build produksi |
| `npm run typecheck` | Pemeriksaan TypeScript |
| `npm run lint` | Pemeriksaan ESLint |
| `npm run lint:fix` | ESLint dengan auto-fix |
| `npm run preview` | Pratinjau hasil build |

## Login demo

Halaman `/login` menyediakan dua akun lokal untuk mencoba role:

| Role | Email | Password | Redirect |
| --- | --- | --- | --- |
| Owner | `owner@eatersive.id` | `owner123` | `/owner` |
| Pelanggan | `user@eatersive.id` | `user123` | `/layanan` |

Login ini hanya demo frontend (data ada di bundle, tanpa backend). Route `/owner` dilindungi `RequireRole`; halaman user tetap publik.

## Konfigurasi API

Semua request melewati satu instance Axios di `src/api/client.ts`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Vite hanya membaca `.env` saat start, jadi restart `npm run dev` setelah mengubahnya.

## Struktur

- `src/api/` — Axios client dan fungsi pemanggilan API
- `src/components/` — komponen UI yang dapat dipakai ulang
- `src/layouts/` — layout aplikasi
- `src/pages/` — halaman
- `src/routes/AppRoutes.tsx` — definisi route React Router
- `src/types/` — tipe kontrak API
