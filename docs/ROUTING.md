# Dokumentasi Routing — Laravel API + React Router

Dokumen ini menjelaskan secara lengkap bagaimana routing di template ini disambungkan: dari file konfigurasi Laravel, definisi route API, sampai React Router di browser dan pemanggilan Axios yang menghubungkan keduanya.

Inti pembagian tugasnya:

| Lapisan | Menangani | File utama |
| --- | --- | --- |
| Laravel Router | Endpoint REST API (`/api/v1/*`) dan route web sederhana (`/`, `/up`) | `backend/bootstrap/app.php`, `backend/routes/api.php`, `backend/routes/web.php` |
| React Router (BrowserRouter) | Perpindahan halaman di browser (`/`, `/about`, `/api-status`) | `frontend/src/App.tsx`, `frontend/src/routes/AppRoutes.tsx` |
| Axios | Memanggil endpoint Laravel dari halaman React | `frontend/src/api/client.ts`, `frontend/src/api/health.ts` |
| CORS | Mengizinkan browser frontend membaca respons backend | `backend/config/cors.php` |

React **bukan** dirender oleh Blade. Laravel tidak pernah menerima request untuk `/about` atau `/api-status`; kedua URL itu dilayani oleh dev server Vite.

---

## 1. Peta File Routing

```text
backend/
├── public/index.php                  # entry point semua request backend
├── bootstrap/app.php                 # mendaftarkan file route web, api, console, health
├── routes/web.php                    # GET /  → view welcome (bukan React)
├── routes/api.php                    # GET /api/v1/health, /api/v1/ping (prefix /api otomatis)
├── app/Http/Controllers/Api/V1/
│   ├── HealthController.php          # handler endpoint health
│   └── PingController.php            # contoh handler endpoint baru
├── tests/Feature/Api/
│   ├── HealthTest.php
│   └── PingTest.php                  # contoh test endpoint baru
└── config/cors.php                   # origin frontend yang diizinkan

frontend/
├── index.html                        # <div id="root"> + memuat /src/main.tsx
└── src/
    ├── main.tsx                      # ReactDOM.createRoot(#root).render(<App />)
    ├── App.tsx                       # BrowserRouter
    ├── routes/AppRoutes.tsx          # <Routes> + daftar <Route>
    ├── layouts/MainLayout.tsx        # layout + navigasi + <Outlet />
    ├── pages/                        # komponen halaman
    ├── api/client.ts                 # instance Axios (baseURL dari env)
    ├── api/health.ts                 # GET /health
    └── types/api.ts                  # tipe kontrak response
```

---

## 2. Routing di Laravel

### 2.1 Entry point request

Semua request backend masuk lewat `backend/public/index.php`, yang memuat `bootstrap/app.php`. Di Laravel 11+ konfigurasi routing application dilakukan di file ini (bukan lagi lewat `RouteServiceProvider`):

```php
// backend/bootstrap/app.php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
```

Arti tiap argumen:

| Argumen | Efek |
| --- | --- |
| `web: routes/web.php` | Route dengan middleware group `web` (session, cookie, CSRF), tanpa prefix. |
| `api: routes/api.php` | Route dengan middleware group `api`, **otomatis diberi prefix `/api`**. |
| `commands: routes/console.php` | Route untuk artisan command, bukan HTTP. |
| `health: '/up'` | Endpoint bawaan Laravel untuk health check framework (`/up`), terpisah dari `/api/v1/health` milik aplikasi. |

Karena `api:` tidak diberi `apiPrefix` khusus, Laravel memakai default `api`. Jadi isi `routes/api.php` sudah otomatis beralamat di bawah `/api`.

### 2.2 File route API dan prefix versi

```php
// backend/routes/api.php
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PingController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class)->name('api.v1.health');

    // Contoh endpoint untuk pola penambahan fitur API baru.
    Route::get('/ping', PingController::class)->name('api.v1.ping');
});
```

Alamat akhirnya dibentuk dari tiga bagian:

```text
/api          → prefix otomatis dari withRouting(api: ...)
/v1           → Route::prefix('v1')
/health       → Route::get('/health')
─────────────────────────────────────────────
GET /api/v1/health   (nama route: api.v1.health)

GET /api/v1/ping     (nama route: api.v1.ping)
```

`HealthController::class` dan `PingController::class` dipakai langsung karena kedua controller-nya *invokable* (`__invoke`), sehingga tidak perlu `[Controller::class, 'index']` untuk satu endpoint. Contoh `ping` dijelaskan lengkap di bagian 6.1.

### 2.3 Controller dan bentuk response

```php
// backend/app/Http/Controllers/Api/V1/HealthController.php
public function __invoke(): JsonResponse
{
    return response()->json([
        'success' => true,
        'message' => 'Laravel API is running',
        'data' => ['status' => 'ok'],
    ]);
}
```

Handler ini sengaja tidak menyentuh database, cache, atau service eksternal, sehingga `/api/v1/health` tetap berhasil walau database belum dikonfigurasi.

### 2.4 Route web hanya untuk keperluan backend

```php
// backend/routes/web.php
Route::get('/', function () {
    return view('welcome');
});
```

Route ini mengembalikan halaman HTML sederhana dari `resources/views/welcome.blade.php`. Ini **bukan** entry point React; aplikasi React dijalankan terpisah di port 5173. Jangan menambahkan route catch-all React di sini.

### 2.5 Middleware yang menempel

Cek dengan `php artisan route:list -v --path=api`:

```text
GET|HEAD  api/v1/health .... api.v1.health › Api\V1\HealthController
          ⇂ api
GET|HEAD  api/v1/ping ...... api.v1.ping   › Api\V1\PingController
          ⇂ api
```

Route health memakai middleware group `api` (stateless: tanpa session dan tanpa CSRF token). Middleware CORS (`HandleCors`) berjalan global, sehingga header CORS tetap ditambahkan untuk path yang cocok dengan `config/cors.php`.

### 2.6 CORS: penghubung izin antar-origin

Karena frontend (`http://localhost:5173`) dan backend (`http://127.0.0.1:8000`) berbeda origin, browser hanya mau membaca respons API jika backend mengirim header `Access-Control-Allow-Origin`.

```php
// backend/config/cors.php
$frontendOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('FRONTEND_URL', 'http://localhost:5173,http://127.0.0.1:5173'))
)));

return [
    'paths' => ['api/*'],              // hanya path /api/* yang diberi header CORS
    'allowed_methods' => ['*'],
    'allowed_origins' => $frontendOrigins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'supports_credentials' => false,   // belum ada auth berbasis cookie
    // ...
];
```

Daftar origin diatur dari `.env`:

```env
FRONTEND_URL=http://localhost:5173,http://127.0.0.1:5173
```

Origin yang tidak terdaftar tetap mendapat respons 200, tetapi **tanpa** header `Access-Control-Allow-Origin`, sehingga browser memblokir pembacaan respons. Setelah mengubah `FRONTEND_URL`, jalankan `php artisan config:clear` dan restart server.

### 2.7 Error API dalam bentuk JSON

```php
// backend/bootstrap/app.php
$exceptions->shouldRenderJsonWhen(
    fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
);
```

Konsekuensinya, request ke path `/api/*` yang tidak terdaftar (misalnya `/api/v1/tidak-ada`) dibalas **404 dalam format JSON**, bukan halaman HTML error. Ini memudahkan Axios menampilkan pesan error yang konsisten.

---

## 3. Routing di React

### 3.1 Urutan bootstrap frontend

```text
index.html
  └─ <div id="root"> + <script type="module" src="/src/main.tsx">
       └─ main.tsx  : createRoot(#root).render(<StrictMode><App /></StrictMode>)
            └─ App.tsx : <BrowserRouter><AppRoutes /></BrowserRouter>
                 └─ AppRoutes.tsx : <Routes> ... </Routes>
                      └─ MainLayout : header + <nav> + <Outlet />
                           └─ pages/* : konten halaman
```

### 3.2 `BrowserRouter` di `App.tsx`

```tsx
// frontend/src/App.tsx
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
```

`BrowserRouter` memakai HTML5 History API. Ia membaca `window.location.pathname` (misalnya `/api-status`) untuk menentukan halaman, dan `NavLink`/`Link` mengubah URL **tanpa full page reload**.

### 3.3 Daftar route di `AppRoutes.tsx`

```tsx
// frontend/src/routes/AppRoutes.tsx
<Routes>
  <Route element={<MainLayout />}>
    <Route index element={<HomePage />} />
    <Route path="about" element={<AboutPage />} />
    <Route path="api-status" element={<ApiStatusPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
</Routes>
```

Detail yang perlu dipahami:

- `<Route element={<MainLayout />}>` adalah **layout route** tanpa `path`. Ia selalu cocok dan hanya menyediakan kerangka UI.
- `<Outlet />` di dalam `MainLayout` adalah tempat halaman anak dirender.
- `index` berarti route default untuk path induk, yaitu `/`.
- `path="about"` relatif terhadap induk (induk tanpa path), sehingga menjadi `/about`.
- `path="*"` menangkap URL yang tidak dikenal dan menampilkan `NotFoundPage` — tetap di dalam layout.
- Tidak ada route untuk `/api/v1/*` di React. Path API bukan halaman dan tidak pernah dibuka lewat browser address bar.

### 3.4 Navigasi di `MainLayout.tsx`

```tsx
const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About', end: false },
  { to: '/api-status', label: 'API Status', end: false },
];

<NavLink
  to={item.to}
  end={item.end}
  className={({ isActive }) => (isActive ? 'app-nav__link is-active' : 'app-nav__link')}
>
  {item.label}
</NavLink>
```

- `NavLink` memberi class aktif otomatis sehingga menu dapat ditandai.
- `end: true` pada `/` penting: tanpa itu, `/` akan dianggap aktif juga saat berada di `/about`.
- Semua item menu didefinisikan sekali di array lalu dirender dengan `.map()`.

### 3.5 Bagaimana URL langsung seperti `/api-status` bisa terbuka?

Dev server Vite berjalan dengan mode SPA (`appType: 'spa'`, default). Untuk request navigasi HTML ke path yang bukan file statis, Vite mengembalikan `index.html`. Setelah itu React Router yang membaca path dan merender halaman yang tepat.

Konsekuensi saat deploy produksi: web server statis harus diatur agar semua path non-aset di-rewrite ke `index.html`, **kecuali** path API. `npm run preview` (port 4173) sudah menangani fallback ini secara otomatis. Jangan arahkan fallback tersebut ke Laravel.

---

## 4. Alur Integrasi End-to-End

Contoh kasus: pengguna membuka `http://localhost:5173/api-status` dan halaman memanggil backend.

```text
1. Browser  → GET http://localhost:5173/api-status
2. Vite     → kembalikan index.html (SPA fallback)
3. main.tsx → mount <App /> ke #root
4. App.tsx  → BrowserRouter membaca pathname "/api-status"
5. AppRoutes→ cocok ke layout + <Route path="api-status"> → ApiStatusPage
6. ApiStatusPage (useEffect) → fetchHealth()
7. health.ts → apiClient.get('/health')
8. Axios    → baseURL + path = http://127.0.0.1:8000/api/v1/health
9. Browser  → kirim request + header Origin: http://localhost:5173
10. Laravel → public/index.php → bootstrap/app.php (prefix /api)
              → routes/api.php (prefix /v1) → HealthController::__invoke
11. Laravel → JsonResponse + header Access-Control-Allow-Origin (jika origin cocok)
12. Axios   → resolve promise, data bertipe HealthResponse
13. React   → setState sukses → StatusPanel "Backend terhubung"
```

Jika langkah 9–12 gagal (backend mati, port salah, atau CORS tidak cocok), promise ditolak dan `getApiErrorMessage()` mengubahnya menjadi pesan yang ditampilkan pada panel error. Bila respons HTTP error dari Laravel, `message` milik Laravel dipakai lebih dulu.

### 4.1 Detail pemanggilan Axios

```ts
// frontend/src/api/client.ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,        // http://127.0.0.1:8000/api/v1
  timeout: 10_000,
  headers: { Accept: 'application/json' },
});
```

```ts
// frontend/src/api/health.ts
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health', { signal });
  return response.data;
}
```

Penggabungan URL:

```text
VITE_API_BASE_URL = http://127.0.0.1:8000/api/v1
path              = /health
────────────────────────────────────────────────────
request URL       = http://127.0.0.1:8000/api/v1/health
```

Aturan yang harus dijaga:

- `VITE_API_BASE_URL` **sudah** memuat `/api/v1`; jangan menambahkan `/api/v1` lagi di fungsi API.
- Base URL ditulis tanpa trailing slash, path dimulai dengan `/`, agar tidak muncul `//`.
- URL backend tidak boleh ditulis ulang di komponen; semua lewat `apiClient`.
- Vite hanya membaca `.env` saat start. Setelah mengubah `VITE_API_BASE_URL`, restart `npm run dev`.

### 4.2 Kenapa `/api-status` memakai `useEffect` + `AbortController`

```tsx
useEffect(() => {
  const controller = new AbortController();
  let isActive = true;

  async function loadHealth() { /* fetchHealth(controller.signal) ... */ }
  void loadHealth();

  return () => {
    isActive = false;
    controller.abort();
  };
}, [attempt]);
```

- Efek berjalan sekali saat halaman dibuka, dan berulang saat tombol **Periksa Ulang** menaikkan `attempt`.
- `controller.abort()` membatalkan request bila komponen dilepas atau efek dijalankan ulang.
- `isActive` mencegah `setState` setelah komponen tidak lagi aktif.
- Di `StrictMode` (development), efek dijalankan dua kali; request pertama dibatalkan, request kedua yang dipakai. Ini normal.

---

## 5. Matriks Port, Origin, dan Path

| Komponen | Alamat | Peran |
| --- | --- | --- |
| Vite dev server | `http://localhost:5173` | Menyajikan React + semua route frontend |
| Vite preview | `http://localhost:4173` (opsional) | Pratinjau hasil `npm run build` |
| Laravel | `http://127.0.0.1:8000` | Hanya endpoint API dan route web backend |
| API health | `http://127.0.0.1:8000/api/v1/health` | Data yang dipanggil halaman `/api-status` |
| API ping | `http://127.0.0.1:8000/api/v1/ping` | Contoh endpoint baru (controller + route + test) |
| Framework health | `http://127.0.0.1:8000/up` | Bawaan Laravel, bukan bagian template |

Port frontend dikunci di `frontend/vite.config.ts`:

```ts
server: { port: 5173, strictPort: true },
preview: { port: 4173, strictPort: true },
```

`strictPort: true` membuat Vite gagal start (bukan pindah port diam-diam) jika 5173 sedang dipakai. Ini mencegah origin berubah tanpa disadari sehingga CORS tiba-tiba menolak.

---

## 6. Cara Menambah Route Baru

### 6.1 Endpoint API baru — contoh nyata `GET /api/v1/ping`

Template ini sudah menyertakan satu endpoint contoh yang lengkap agar pola penambahan fitur terlihat jelas. Isinya tiga file:

**a. Controller** — `backend/app/Http/Controllers/Api/V1/PingController.php`

```php
<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;

class PingController
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Pong',
            'data' => [
                'pong' => true,
            ],
        ]);
    }
}
```

**b. Route** — `backend/routes/api.php`, di dalam grup `prefix('v1')`

```php
Route::get('/ping', PingController::class)->name('api.v1.ping');
```

**c. Feature test** — `backend/tests/Feature/Api/PingTest.php`

```php
public function test_ping_endpoint_returns_expected_json(): void
{
    $response = $this->getJson('/api/v1/ping');

    $response
        ->assertOk()
        ->assertExactJson([
            'success' => true,
            'message' => 'Pong',
            'data' => ['pong' => true],
        ]);
}
```

Verifikasi ketiganya:

```bash
php artisan route:list --path=api     # api/v1/ping harus muncul
php artisan test --filter=PingTest    # test contoh harus lulus
curl http://127.0.0.1:8000/api/v1/ping
```

Response yang diharapkan:

```json
{"success":true,"message":"Pong","data":{"pong":true}}
```

Langkah generik untuk endpoint berikutnya mengikuti pola yang sama:

1. Buat controller di `backend/app/Http/Controllers/Api/V1/`.
2. Daftarkan route di `routes/api.php` **di dalam** grup `prefix('v1')` dengan nama `api.v1.<resource>.<action>`.
3. Tambahkan feature test di `backend/tests/Feature/Api/` yang menguji status, struktur JSON, dan kasus error.
4. Verifikasi dengan `php artisan route:list --path=api` dan `php artisan test`.

Jangan membuat file `routes/api_v2.php` atau menambah prefix `/api` manual di dalam `routes/api.php`, karena `/api` sudah ditambahkan otomatis oleh `withRouting(api: ...)`. Untuk versi baru, ubah/ tambahkan `Route::prefix('v2')->group(...)` di file yang sama.

### 6.2 Halaman frontend baru (contoh: `/contact`)

1. Buat `frontend/src/pages/ContactPage.tsx`.
2. Daftarkan di `AppRoutes.tsx`:

```tsx
<Route path="contact" element={<ContactPage />} />
```

3. Tambahkan ke `navItems` di `MainLayout.tsx` bila perlu muncul di menu.
4. Tidak perlu menyentuh Laravel sama sekali.

### 6.3 Consume endpoint baru dari React

1. Tambahkan tipe response di `src/types/api.ts`.
2. Buat fungsi di `src/api/` yang memakai `apiClient` (contoh: `src/api/ping.ts`).
3. Panggil fungsi tersebut dari halaman; jangan membuat instance Axios baru dan jangan menulis URL absolut.

### Checklist

- [ ] Route API terdaftar di `routes/api.php` dalam grup versi.
- [ ] Nama route konsisten (`api.v1.<resource>.<action>`).
- [ ] `php artisan route:list --path=api` menampilkan route baru.
- [ ] Halaman terdaftar di `AppRoutes.tsx` dan (opsional) `navItems`.
- [ ] `npm run lint`, `npm run typecheck`, dan `php artisan test` tetap lulus.
- [ ] Tabel route di `README.md` diperbarui.

---

## 7. Troubleshooting Routing

| Gejala | Penyebab umum | Solusi |
| --- | --- | --- |
| `/about` menampilkan 404 di browser | Membuka port backend (8000), bukan Vite | Buka `http://localhost:5173/about` |
| Reload `/api-status` jadi 404 saat produksi | Web server statis tidak punya SPA fallback | Rewrite path non-aset ke `index.html`; jangan rewrite `/api/*` |
| Menu Home selalu aktif | `end` tidak di-set pada route `/` | Gunakan `end: true` di `NavLink` ke `/` |
| `GET /api/v1/health` 404 | Route tidak terdaftar / prefix salah | Cek `routes/api.php` dan `php artisan route:list --path=api` |
| Response API 200 tapi browser CORS error | Origin frontend tidak ada di `FRONTEND_URL` | Samakan skema+host+port, lalu `php artisan config:clear` dan restart |
| Request menuju `http://127.0.0.1:5173/api/v1/...` | `VITE_API_BASE_URL` tidak diset / salah | Isi `frontend/.env`, restart `npm run dev` |
| Error `VITE_API_BASE_URL belum diatur` | `frontend/.env` belum ada | `cp .env.example .env` di folder `frontend` |
| Request API kena 419/CSRF | Memakai route `web` untuk API | Daftarkan endpoint di `routes/api.php` (middleware stateless) |

---

## 8. Perintah Verifikasi Routing

```bash
# Backend: daftar route API beserta middleware
cd backend
php artisan route:list --path=api -v

# Backend: response health + header CORS
curl -i -H "Origin: http://localhost:5173" http://127.0.0.1:8000/api/v1/health

# Backend: 404 API harus berformat JSON
curl -i http://127.0.0.1:8000/api/v1/tidak-ada

# Frontend: pastikan route SPA dilayani Vite
curl -o /dev/null -w "%{http_code}\n" http://localhost:5173/api-status   # 200
```

Yang diharapkan dari `route:list --path=api -v`:

```text
GET|HEAD  api/v1/health .... api.v1.health › Api\V1\HealthController
          ⇂ api
GET|HEAD  api/v1/ping ...... api.v1.ping   › Api\V1\PingController
          ⇂ api
```

Yang diharapkan dari `curl` health dengan origin frontend:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin

{"success":true,"message":"Laravel API is running","data":{"status":"ok"}}
```

---

## 9. Ringkasan Aturan

1. Satu sumber kebenaran URL backend: `VITE_API_BASE_URL` + `src/api/client.ts`.
2. Laravel hanya menangani `/api/v1/*` (dan route web backend); React Router menangani halaman.
3. Prefix `/api` berasal dari framework, prefix `/v1` dari `routes/api.php` — jangan diduplikasi.
4. Semua halaman React terdaftar di `AppRoutes.tsx`, bukan di `routes/web.php`.
5. CORS hanya mengizinkan origin yang terdaftar di `FRONTEND_URL`; port frontend dikunci agar origin stabil.
6. Setiap endpoint baru wajib punya test dan tercatat di README.
7. Gunakan endpoint `ping` (`PingController` + `PingTest`) sebagai referensi pola controller → route → test.
