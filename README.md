# laravel-react-template

Template starter Laravel API + React TypeScript SPA — dengan backend dan frontend berjalan sebagai dua aplikasi terpisah.

Pendekatan: backend dan frontend adalah dua aplikasi terpisah yang berkomunikasi lewat HTTP + JSON. Backend hanya berfungsi sebagai API JSON. Frontend tidak dirender oleh Blade.

Frontend berjalan sebagai aplikasi terpisah di dalam `frontend/`.

Repo ini bukan aplikasi jadi — tidak ada CRUD, dashboard, atau autentikasi. Isinya fondasi yang sudah tersambung: routing di kedua sisi, satu Axios client, konfigurasi CORS, contoh endpoint, dan test. Clone, jalankan dua server, lalu mulai bangun fitur.

![PHP](https://img.shields.io/badge/PHP-8.3%2B-777BB4?logo=php&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tests](https://img.shields.io/badge/backend%20tests-7%20passed-brightgreen)

---

## Daftar Isi

- [Fitur](#fitur)
- [Stack](#stack)
- [Struktur Project](#struktur-project)
- [Prasyarat](#prasyarat)
- [Quick Start](#quick-start)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Endpoint API](#endpoint-api)
- [Halaman Frontend](#halaman-frontend)
- [Script & Pemeriksaan](#script--pemeriksaan)
- [Alur Integrasi](#alur-integrasi)
- [Dokumentasi Routing](#dokumentasi-routing)
- [Menambah Fitur Baru](#menambah-fitur-baru)
- [Troubleshooting](#troubleshooting)
- [Catatan & Batasan](#catatan--batasan)

---

## Fitur

- **Backend & frontend terpisah** — Laravel hanya menyajikan JSON API, React hanya menyajikan UI. Frontend tidak dirender oleh Blade.
- **Frontend berjalan sebagai aplikasi terpisah di folder frontend/**

Frontend berjalan sebagai aplikasi terpisah di folder `frontend/`:
- React + TypeScript (Vite) menyajikan tampilan dan logika aplikasi.
- Frontend hanya menyajikan halaman dan **tidak menerima request aplikasi** dari browser.
- Frontend **tidak** dirender oleh Blade — ia berjalan melalui dev server Vite atau file statis produksi.
- Komunikasi dengan backend hanya lewat HTTP + JSON via Axios yanng dibaca dari VITE_API_BASE_URL.

Frontend dan backend **berkomunikasi melalui HTTP + JSON**, bukan melalui shared state, WebSocket, atau proses yang sama.
- **API versioning sejak awal** — semua endpoint berada di `/api/v1/*`.
- **Satu Axios client** — `frontend/src/api/client.ts` membaca `VITE_API_BASE_URL`, menangani timeout, dan menormalkan pesan error.
- **CORS terkonfigurasi** — daftar origin diambil dari variabel `FRONTEND_URL`, bukan hardcode di kode.
- **Health check tanpa database** — `/api/v1/health` tetap `200 OK` walau database belum disiapkan.
- **Contoh endpoint baru** — `/api/v1/ping` lengkap dengan controller, route, dan feature test sebagai pola penambahan fitur.
- **Halaman uji integrasi** — `/api-status` menampilkan state loading, sukses, dan error koneksi secara nyata.
- **SPA routing** — React Router dengan layout route, navigasi aktif, dan halaman 404.
- **Kualitas kode** — TypeScript strict, ESLint flat config, PHPUnit, Pint.
- **Tanpa secret di repo** — hanya `.env.example` yang di-commit.

---

## Stack

| Lapisan | Teknologi | Versi |
| --- | --- | --- |
| Backend | Laravel | 13.38 |
| Runtime backend | PHP | ^8.3 (diuji 8.5.10) |
| Testing backend | PHPUnit | 12.5 |
| Formatter backend | Laravel Pint | 1.27 |
| Frontend | React | 19.3 |
| Bahasa | TypeScript | 6.0 |
| Build tool | Vite | 8.3 |
| Routing frontend | React Router DOM | 7.18 |
| HTTP client | Axios | 1.20 |
| Linter | ESLint | 10 (flat config) |
| Database default | MySQL 8 (SQLite/MariaDB didukung) | — |

Server default:

| Aplikasi | URL |
| --- | --- |
| Backend Laravel | `http://127.0.0.1:8000` |
| Frontend Vite | `http://localhost:5173` |

---

## Struktur Project

```text
laravel-react-template/
├── backend/                          # Laravel 13 — REST API
│   ├── app/
│   │   └── Http/Controllers/Api/V1/
│   │       ├── HealthController.php  # GET /api/v1/health
│   │       └── PingController.php    # GET /api/v1/ping (contoh)
│   ├── bootstrap/app.php             # registrasi route web + api + health
│   ├── config/cors.php               # origin dari FRONTEND_URL
│   ├── routes/
│   │   ├── api.php                   # route /api/v1/*
│   │   ├── console.php
│   │   └── web.php                   # halaman info backend
│   ├── tests/Feature/Api/
│   │   ├── HealthTest.php
│   │   └── PingTest.php
│   ├── .env.example                  # MySQL default, APP_KEY kosong
│   └── composer.json
│
├── frontend/                         # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts             # instance Axios + normalisasi error
│   │   │   └── health.ts             # pemanggilan endpoint health
│   │   ├── components/StatusPanel.tsx
│   │   ├── layouts/MainLayout.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── AboutPage.tsx
│   │   │   ├── ApiStatusPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── routes/AppRoutes.tsx
│   │   ├── types/api.ts              # kontrak response API
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example                  # VITE_API_BASE_URL
│   ├── eslint.config.js
│   ├── vite.config.ts                # port 5173 strict
│   └── package.json
│
├── docs/
│   └── ROUTING.md                    # alur routing Laravel ↔ React
├── .gitignore
└── README.md
```

---

## Prasyarat

| Kebutuhan | Versi |
| --- | --- |
| PHP | 8.3+ |
| Composer | 2.x |
| MySQL | 8.x (atau SQLite/MariaDB) |
| Node.js | 20+ (diuji 24.20) |
| npm | 10+ (diuji 11.19) |

Ekstensi PHP yang wajib aktif: `pdo_mysql` (atau `pdo_sqlite`), `mbstring`, `openssl`, `fileinfo`, `ctype`, `json`, `tokenizer`, `xml`.

Cek dengan:

```bash
php -m
composer -V
node -v && npm -v
```

---

## Quick Start

```bash
git clone https://github.com/USERNAME/laravel-react-template.git
cd laravel-react-template
```

### 1. Backend

```bash
cd backend
composer install
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
php artisan key:generate
php artisan serve         # http://127.0.0.1:8000
```

### 2. Frontend (terminal baru)

```bash
cd frontend
npm install
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
npm run dev               # http://localhost:5173
```

### 3. Verifikasi

Buka [`http://localhost:5173/api-status`](http://localhost:5173/api-status). Halaman akan menampilkan loading, lalu status sukses berisi respons asli dari Laravel. Hentikan backend dan klik **Periksa Ulang** untuk melihat state error.

Atau langsung dari terminal:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

> Database **belum diperlukan** untuk menjalankan template ini. Migrasi hanya dibutuhkan saat Anda mulai menambahkan fitur data.

---

## Konfigurasi Environment

### `backend/.env`

Salin dari `backend/.env.example`, lalu sesuaikan bila perlu:

```env
APP_NAME="Laravel React Template"
APP_URL=http://localhost:8000

# Origin frontend yang diizinkan mengakses API (pisahkan dengan koma)
FRONTEND_URL=http://localhost:5173,http://127.0.0.1:5173

# Database default: MySQL
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel_react_template
DB_USERNAME=root
DB_PASSWORD=
```

Jika memakai MySQL, buat database lalu jalankan migrasi:

```bash
php artisan migrate
```

Jika ingin tanpa server database, pakai SQLite:

```env
DB_CONNECTION=sqlite
DB_DATABASE=/path/absolut/ke/backend/database/database.sqlite
```

> Sesuaikan DB_CONNECTION di .env.example menjadi `sqlite`, lalu jalankan `php artisan migrate`. APP_KEY kosong di `.env.example` — jalankan `php artisan key:generate` setelah setup.

### `frontend/.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Vite hanya membaca `.env` saat start — restart `npm run dev` setelah mengubahnya. Jangan menulis URL API langsung di komponen; gunakan `apiClient` dari `src/api/client.ts`.

> `.env` sudah di-ignore oleh Git. Hanya `.env.example` yang masuk repository dan tidak berisi secret.

---

## Endpoint API

| Method | Endpoint | Nama route | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | `api.v1.health` | Health check, tidak menyentuh database |
| GET | `/api/v1/ping` | `api.v1.ping` | Contoh endpoint baru (controller + route + test) |

Format response selalu `{ success, message, data }`.

**`GET /api/v1/health`**

```json
{
  "success": true,
  "message": "Laravel API is running",
  "data": {
    "status": "ok"
  }
}
```

**`GET /api/v1/ping`**

```json
{
  "success": true,
  "message": "Pong",
  "data": {
    "pong": true
  }
}
```

Request ke path API yang tidak ada mengembalikan **404 dengan `Content-Type: application/json`**, bukan halaman HTML.

Periksa route yang terdaftar:

```bash
cd backend
php artisan route:list --path=api
```

Laravel juga menyediakan `/up` (framework health check bawaan) yang bukan bagian dari kontrak API template ini.

---

## Halaman Frontend

| Path | Komponen | Keterangan |
| --- | --- | --- |
| `/` | `HomePage` | Ringkasan template dan langkah cepat |
| `/about` | `AboutPage` | Penjelasan stack dan struktur project |
| `/api-status` | `ApiStatusPage` | Uji koneksi backend: loading / sukses / error |
| `*` | `NotFoundPage` | Halaman 404 untuk route tak dikenal |

Semua halaman dibungkus `MainLayout` (header, navigasi `NavLink`, footer) melalui layout route + `<Outlet />`.

---

## Script & Pemeriksaan

### Frontend

```bash
cd frontend
npm run dev         # dev server (port 5173, strict)
npm run typecheck   # tsc -b
npm run lint        # ESLint
npm run lint:fix    # ESLint auto-fix
npm run build       # typecheck + build produksi ke dist/
npm run preview     # pratinjau hasil build (port 4173)
```

### Backend

```bash
cd backend
php artisan test            # seluruh test
php artisan test --filter=Api
./vendor/bin/pint           # format kode
php artisan route:list      # daftar route
composer setup              # install + buat .env + app key
composer dev                # php artisan serve
```

Cakupan test backend:

- `tests/Feature/Api/HealthTest.php` — struktur JSON health check, header CORS untuk origin yang diizinkan, penolakan origin asing.
- `tests/Feature/Api/PingTest.php` — response persis dan nama route `api.v1.ping`.
- `tests/Feature/ExampleTest.php` — halaman web backend merespons 200.
- `tests/Unit/ExampleTest.php` — contoh unit test.

Hasil terakhir di environment pengembangan: **7 passed (11 assertions)**.

---

## Alur Integrasi

```text
Browser
   │
   ▼
React Router (Vite, :5173)
   │  klik / buka URL
   ▼
Axios API Client (src/api/client.ts)
   │  baseURL + /health, header Origin
   ▼
Laravel API Routes (/api/v1/*, :8000)
   │  middleware api + CORS
   ▼
Controller → JSON { success, message, data }
   │
   ▼
React UI (loading → sukses / error)
```

Detail langkah demi langkah — entry point, prefix, middleware group, konfigurasi CORS, komposisi URL, sampai render komponen — ada di [`docs/ROUTING.md`](docs/ROUTING.md).

---

## Dokumentasi Routing

[`docs/ROUTING.md`](docs/ROUTING.md) berisi 9 bagian:

1. **Peta file routing** backend dan frontend.
2. **Routing di Laravel** — entry point (`public/index.php` → `bootstrap/app.php`), prefix `/api` otomatis + `/v1` manual, controller, route web, middleware group, CORS, dan error JSON.
3. **Routing di React** — urutan bootstrap, `BrowserRouter`, daftar `Route`, `NavLink`, dan cara URL langsung seperti `/api-status` bisa terbuka.
4. **Alur integrasi end-to-end** — trace request 13 langkah, detail pemanggilan Axios, serta alasan `useEffect` + `AbortController`.
5. **Matriks port, origin, dan path**.
6. **Cara menambah route baru** di kedua sisi, lengkap dengan checklist.
7. **Troubleshooting routing**.
8. **Perintah verifikasi** beserta output yang diharapkan.
9. **Ringkasan aturan** yang perlu diingat.

---

## Menambah Fitur Baru

Pola yang dipakai template ini (contoh nyata: `GET /api/v1/ping`):

1. **Controller** — buat di `backend/app/Http/Controllers/Api/V1/`, kembalikan `{ success, message, data }`.
2. **Route** — daftarkan di `backend/routes/api.php` **di dalam** grup `prefix('v1')`, beri nama `api.v1.*`.
3. **Test** — tambahkan feature test di `backend/tests/Feature/Api/` yang memeriksa status, struktur JSON, dan nama route.
4. **Tipe frontend** — tambahkan kontrak response di `frontend/src/types/api.ts`.
5. **Fungsi API** — buat pemanggilan di `frontend/src/api/` memakai `apiClient`; jangan membuat instance Axios baru.
6. **Halaman** — buat komponen di `frontend/src/pages/` lalu daftarkan route-nya di `frontend/src/routes/AppRoutes.tsx`.

Verifikasi:

```bash
cd backend && php artisan route:list --path=api && php artisan test
cd frontend && npm run lint && npm run typecheck
```

Untuk autentikasi, instal Laravel Sanctum (`php artisan install:api`) saat benar-benar dibutuhkan, lalu aktifkan `supports_credentials` di `backend/config/cors.php` bila memakai cookie-based SPA auth.

---

## Troubleshooting

### CORS error di browser

`Access to XMLHttpRequest ... has been blocked by CORS policy`

- Pastikan origin frontend terdaftar di `FRONTEND_URL` pada `backend/.env`.
- Origin harus sama persis: `http://localhost:5173` ≠ `http://127.0.0.1:5173`.
- Setelah mengubah `.env`, jalankan `php artisan config:clear` dan restart `php artisan serve`.
- Cek header: `curl -i -H "Origin: http://localhost:5173" http://127.0.0.1:8000/api/v1/health`

### Port sudah dipakai

- Backend: `php artisan serve --port=8001`, lalu sesuaikan `VITE_API_BASE_URL`.
- Frontend: port 5173 dikunci (`strictPort: true`). Hentikan proses yang memakainya, atau ubah `server.port` **dan** `FRONTEND_URL`.

```bash
netstat -ano | grep -E "8000|5173"
```

### `/api-status` menampilkan error koneksi

- Pastikan `php artisan serve` masih berjalan.
- Pastikan `VITE_API_BASE_URL` menunjuk ke backend yang benar, termasuk prefix `/api/v1`.
- Restart `npm run dev` setelah mengubah `.env`.
- Pesan `VITE_API_BASE_URL belum diatur` berarti `frontend/.env` belum dibuat.

### `php artisan serve` gagal / 500

- Pastikan `APP_KEY` terisi (`php artisan key:generate`).
- Jalankan `php artisan config:clear` bila konfigurasi di-cache.
- Periksa `backend/storage/logs/laravel.log`.

---

## Catatan & Batasan

- Template ini **tidak** menyertakan autentikasi, CRUD, atau state management global.
- Backend dan frontend adalah aplikasi terpisah; frontend **tidak** dirender oleh Blade.
- Frontend dan backend dideploy terpisah. Untuk hosting frontend sebagai static site, konfigurasikan SPA fallback (semua path diarahkan ke `index.html`); atur `VITE_API_BASE_URL` ke URL backend produksi dan tambahkan origin produksi ke `FRONTEND_URL`.
- Health check sengaja tidak memeriksa database, cache, atau service eksternal.
- `APP_DEBUG=true` di environment lokal membuat response error menyertakan detail trace. Set `APP_DEBUG=false` di produksi.
- Migrasi MySQL belum diuji pada template ini karena environment pengembangan memakai SQLite; jalankan `php artisan migrate` setelah database dibuat.
- `backend/AGENTS.md` dan `backend/CLAUDE.md` adalah bootstrap guideline dari Laravel Boost, bukan bagian dari aplikasi.
