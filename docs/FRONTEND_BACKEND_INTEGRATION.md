# Panduan Integrasi Frontend → Backend (untuk Tim Backend)

Dokumen ini menjelaskan cara menyambungkan aplikasi React di `frontend/` dengan API
Laravel di `backend/`, lewat route. Isinya: kondisi API saat ini, kontrak endpoint
yang dibutuhkan frontend, bentuk JSON yang diharapkan, contoh route/controller,
serta langkah verifikasi.

Dokumen pendamping:

- `docs/ROUTING.md` — cara kerja routing Laravel + React dan penambahan endpoint.
- `frontend/DATA_CLEANUP.md` — data contoh yang sudah dihapus dan empty state yang
  menggantikannya.
- `frontend/STRUCTURE.md` — peta halaman, route frontend, dan sumber data.

> ## ⚠️ Status dokumen
>
> Dokumen ini adalah **usulan kontrak / roadmap**, bukan acuan integrasi saat ini.
> Endpoint yang **sudah berjalan** (auth, layanan, review) didokumentasikan di
> **`docs/API.md`** — pakai itu untuk menyambungkan frontend sekarang.
>
> Path seperti `/services`, `/catalog`, `/orders`, `/dashboard/summary`, dan
> `/reviews` (index/moderasi) **belum tersedia** di backend. Bagian orders,
> pembayaran, dashboard, katalog owner, dan moderasi review di dokumen ini
> adalah target tahap berikutnya.
>
> Perbedaan nama yang harus diingat: backend memakai `/layanan` (bukan `/services`),
> field snake_case (`nama`, `harga`, `foto`), id integer, dan role `admin`
> (bukan `owner`). Pemetaan ke tipe UI dilakukan oleh adapter di
> `frontend/src/api/layanan.ts`.

---

## 1. Ringkasan Kondisi Saat Ini

| Bagian | Status |
| --- | --- |
| Endpoint backend | Auth (`/auth/*`), layanan (`/layanan`), dan review (`POST /reviews`) sudah berjalan. Orders, pembayaran, katalog owner, dashboard, dan moderasi review **belum ada** |
| Route frontend | Lengkap: landing, login, alur pemesanan user, 5 halaman owner (`frontend/src/routes/AppRoutes.tsx`) |
| Sumber data frontend | `src/data/*` dummy sudah dihapus; katalog user & owner kini membaca API lewat `src/lib/catalog-store.ts` dan `src/api/layanan.ts` |
| Autentikasi | Sanctum Bearer token dari `POST /api/v1/auth/login`; sesi disimpan di `localStorage`/`sessionStorage` |
| Axios client | `src/api/client.ts` — interceptor `Authorization: Bearer <token>` + auto-logout saat 401 |
| Tipe kontrak | `src/types/api.ts` (envelope) dan `src/types/eatersive.ts` (data domain, dipenuhi lewat adapter) |

Artinya: tugas backend adalah **mengisi route API**, lalu frontend mengganti
pembacaan `src/data/*` dengan pemanggilan `src/api/*`. Tampilan dan empty state
sudah siap, jadi tidak perlu mengubah markup.

Alamat default:

| Komponen | Alamat |
| --- | --- |
| Vite dev server | `http://localhost:5173` |
| Laravel | `http://127.0.0.1:8000` |
| Base API di frontend | `http://127.0.0.1:8000/api/v1` (`VITE_API_BASE_URL`) |

---

## 2. Aturan Dasar yang Harus Dipatuhi Backend

1. **Semua endpoint baru di bawah `/api/v1`.** Prefix `/api` ditambahkan otomatis
   oleh `bootstrap/app.php`; prefix `/v1` didaftarkan di `routes/api.php`. Jangan
   menulis `/api` lagi di dalam file route.
2. **Daftarkan route di `routes/api.php`, bukan `routes/web.php`.** Route `web`
   memakai session + CSRF (419) dan tidak cocok untuk SPA.
3. **Nama route berpola `api.v1.<resource>.<action>`**, misalnya
   `api.v1.orders.index`, `api.v1.orders.show`, `api.v1.reviews.reply`.
4. **Envelope response seragam:**

   ```json
   { "success": true, "message": "Pesan untuk manusia", "data": { } }
   ```

   Frontend sudah memakai tipe `ApiResponse<TData>` di `src/types/api.ts`.
5. **Kunci JSON memakai camelCase** (`customerPhone`, `createdAt`,
   `servicePrice`). Ini bukan gaya default Eloquent (snake_case), jadi map
   lewat API Resource atau `->only([...])` agar cocok dengan tipe TypeScript
   yang sudah ada (`src/types/eatersive.ts`).
6. **Tanggal dalam ISO 8601** (`2026-09-24T09:30:00Z`). Frontend memformat sendiri
   ke `id-ID`; jangan kirim string tanggal yang sudah diformat.
7. **Uang dalam integer rupiah** (`65000`), bukan `"Rp 65.000"`. Frontend
   memformatnya dengan `formatCurrency()`.
8. **Error tetap JSON.** Sudah diatur `shouldRenderJsonWhen(...)` untuk `api/*`.
   Frontend menampilkan `response.data.message`, jadi isi `message` dengan pesan
   yang bisa dibaca pengguna. Untuk validasi, balas `422` dengan `message` +
   `errors` standar Laravel.
9. **CORS.** Hanya origin di `FRONTEND_URL` yang mendapat header CORS. Setelah
   mengubah `.env`, jalankan `php artisan config:clear` lalu restart server.

---

## 3. Peta Route Backend yang Dibutuhkan

Kolom "Pemakai" menunjuk halaman/berkas frontend yang akan memanggil route
tersebut setelah integrasi.

### 3.1 Publik / user

| Method | Path | Nama route | Pemakai | Fungsi |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health` | `api.v1.health` | `/api-status` | Sudah ada |
| `GET` | `/api/v1/services` | `api.v1.services.index` | `/layanan`, `/pembayaran` | Katalog layanan aktif |
| `GET` | `/api/v1/services/{service}` | `api.v1.services.show` | `/layanan` (validasi item keranjang) | Satu layanan |
| `POST` | `/api/v1/orders` | `api.v1.orders.store` | `/pembayaran` | Membuat pesanan dari keranjang |
| `GET` | `/api/v1/orders/{order}` | `api.v1.orders.show` | `/konfirmasi-pesanan`, `/lacak-pesanan` | Rincian + status pesanan |
| `POST` | `/api/v1/orders/{order}/reviews` | `api.v1.orders.reviews.store` | `/lacak-pesanan` | Kirim ulasan pelanggan |
| `GET` | `/api/v1/landing/testimonials` | `api.v1.landing.testimonials` | `/` (bagian testimoni) | Testimoni nyata (opsional) |

### 3.2 Owner (butuh autentikasi owner)

| Method | Path | Nama route | Pemakai | Fungsi |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/dashboard/summary` | `api.v1.dashboard.summary` | `/owner` | Metrik, grafik, ringkasan layanan |
| `GET` | `/api/v1/orders` | `api.v1.orders.index` | `/owner/orders`, `/owner` | Daftar pesanan (filter/pagination) |
| `PATCH` | `/api/v1/orders/{order}/status` | `api.v1.orders.status` | `/owner/orders/{id}` | Update status + catatan |
| `GET` | `/api/v1/catalog` | `api.v1.catalog.index` | `/owner/catalog` | Daftar layanan katalog |
| `POST` | `/api/v1/catalog` | `api.v1.catalog.store` | `/owner/catalog` | Tambah layanan |
| `PATCH` | `/api/v1/catalog/{service}` | `api.v1.catalog.update` | `/owner/catalog` | Ubah / aktif-nonaktifkan |
| `DELETE` | `/api/v1/catalog/{service}` | `api.v1.catalog.destroy` | `/owner/catalog` | Hapus layanan |
| `GET` | `/api/v1/reviews` | `api.v1.reviews.index` | `/owner/reviews` | Ulasan + filter status |
| `PATCH` | `/api/v1/reviews/{review}/status` | `api.v1.reviews.status` | `/owner/reviews` | Moderasi (publikasi/sembunyikan) |
| `PUT` | `/api/v1/reviews/{review}/reply` | `api.v1.reviews.reply` | `/owner/reviews` | Simpan balasan owner |

> Catatan binding: `id` layanan di kontrak adalah string (`"basic"`, `"srv-basic"`),
> bukan integer. Karena itu route detail sebaiknya memakai explicit binding
> `{service:slug}` (atau `getRouteKeyName()` di model), bukan `{service}` biasa
> yang akan mencocokkan primary key integer.
>
> Catatan: `/api/v1/services` dan `/api/v1/catalog` boleh menunjuk tabel yang sama.
> Bedanya hanya akses: `services` publik dan hanya `active = true`, `catalog`
> owner dan menampilkan semua. Kalau ingin satu resource saja, gunakan
> `/api/v1/services` dengan query `?active=1` / `?active=all` — asalkan
> didokumentasikan di README.

### 3.3 Autentikasi

| Method | Path | Nama route | Fungsi |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | `api.v1.auth.login` | Login, balas `token` + `user` |
| `GET` | `/api/v1/auth/me` | `api.v1.auth.me` | Profil dari token |
| `POST` | `/api/v1/auth/logout` | `api.v1.auth.logout` | Revoke token |

Sanctum **sudah terpasang** dan dipakai (`auth:sanctum`). Endpoint login, `me`,
dan logout sudah berjalan; `me` mengembalikan `data: { user: {...} }` dan role
user adalah `admin | user` (frontend memetakan `admin` → `owner`). Halaman owner
tetap dilindungi `RequireRole` di client **dan** middleware `auth:sanctum` +
`admin` di backend.

---

## 4. Kontrak JSON per Resource

Bentuk di bawah ini **sudah** dideklarasikan di `frontend/src/types/eatersive.ts`.
Ikuti persis agar frontend tidak perlu mengubah tipe.

### 4.1 `GET /api/v1/services` → `CatalogService[]`

```json
{
  "success": true,
  "message": "Daftar layanan",
  "data": [
    {
      "id": "basic",
      "name": "Basic",
      "description": "Jasa cuci luar dan dalam",
      "category": "Cleaning",
      "price": 35000,
      "priceLabel": "Rp 35.000",
      "estimate": "2–3 Hari",
      "rating": 4.9,
      "reviewCount": 1240,
      "image": "https://.../large.jpg",
      "thumbnail": "https://.../small.jpg",
      "search": "basic cleaning cuci luar dalam sepatu"
    }
  ]
}
```

- `category` ∈ `Cleaning | Treatment | Repair | Unyellowing`.
- `priceLabel` boleh dihitung backend untuk teks seperti `"Rp 30.000 – 50.000"`;
  `price` tetap dipakai untuk kalkulasi keranjang.
- `search` adalah string pencarian gabungan (nama + deskripsi + kategori) karena
  filter di `/layanan` mencocokkan field ini di sisi client.
- `rating` dan `reviewCount` boleh `0` bila belum ada ulasan.

### 4.2 `POST /api/v1/orders` (checkout) → `CheckoutOrder`

Request (dari `saveConfirmationOrder` di `frontend/src/lib/checkout.ts`):

```json
{
  "items": { "basic": 2, "hard": 1 },
  "address": {
    "address": "Jl. Diponegoro No. 18, Surabaya",
    "recipient": "Rio Amamiya",
    "phone": "081234567890",
    "notes": "Rumah pagar hitam"
  },
  "paymentMethod": "QRIS / E-Wallet"
}
```

Response minimal:

```json
{
  "success": true,
  "message": "Pesanan dibuat",
  "data": {
    "orderId": "ORD-240915",
    "createdAt": "2026-09-24T09:30:00Z",
    "address": { "address": "...", "recipient": "...", "phone": "...", "notes": "..." },
    "items": { "basic": 2, "hard": 1 },
    "paymentMethod": "QRIS / E-Wallet"
  }
}
```

Validasi yang diharapkan: `items` tidak kosong, tiap key ada di tabel layanan dan
`quantity` bilangan bulat 1–99, alamat + penerima + telepon wajib. Backend
**wajib menghitung ulang total dari harga di database**, jangan percaya nominal
dari client.

### 4.3 `GET /api/v1/orders/{order}` → `OwnerOrderDetail`

Satu bentuk dipakai halaman konfirmasi/lacak (user) dan detail owner:

```json
{
  "success": true,
  "message": "Detail pesanan",
  "data": {
    "id": "ORD-9821039",
    "customer": "Jeong Jaehyun",
    "customerPhone": "+62 812-9988-7766",
    "customerAvatar": "https://.../avatar.jpg",
    "address": "Jl. Kemang Timur No. 12, Jakarta Selatan",
    "category": "Treatment",
    "service": "Hard",
    "estimate": "4–5 Hari",
    "status": "Proses",
    "sequence": 4,
    "serviceImage": "https://.../service.jpg",
    "createdAt": "2026-09-24T09:30:00Z",
    "product": "Air Jordan 1 Retro High",
    "icon": "👟",
    "size": "42",
    "color": "White / University Blue",
    "condition": "Kotor berat, outsole menguning.",
    "paymentService": "Layanan: Deep Cleaning + Unyellowing",
    "servicePrice": 165000,
    "deliveryPrice": 20000,
    "note": "Tahap 1: Deep cleaning bagian upper."
  }
}
```

- `status` ∈ `Selesai | Proses` (dipakai badge di `/owner/orders`).
- `sequence` mengurutkan daftar; `createdAt` untuk sort "terbaru/terlama".
- `category` memakai subset tanpa `Unyellowing`.

### 4.4 `GET /api/v1/orders` → daftar ringkas untuk tabel owner

Frontend membutuhkan baris dashboard dalam bentuk:

```json
{ "id": "ORD-7214", "customer": "Budi Santoso", "service": "Deep Cleaning",
  "status": "proses", "statusLabel": "Diproses", "total": 85000 }
```

`status` di tabel dashboard memakai huruf kecil (`proses | selesai | menunggu |
dibatalkan`), sedangkan detail memakai `Proses | Selesai`. Pilih salah satu
konvensi untuk backend dan **dokumentasikan pemetaannya**; frontend yang akan
menyesuaikan tipe setelah kontrak disepakati.

Query yang sebaiknya didukung: `?status=`, `?category=`, `?search=`, `?sort=`
(`newest|oldest|customer`), `?page=` (pagination 5–10 baris).

### 4.5 `PATCH /api/v1/orders/{order}/status` → `OrderProgress`

```json
{ "status": "Siap Diantar", "note": "Sudah melalui tahap unyellowing." }
```

```json
{
  "success": true,
  "message": "Status diperbarui",
  "data": {
    "status": "Siap Diantar",
    "note": "Sudah melalui tahap unyellowing.",
    "updatedAt": "2026-09-26T14:20:00Z"
  }
}
```

Pilihan status yang sudah ada di UI: `Sedang Dikerjakan`, `Menunggu`,
`Pengecekan`, `Siap Diantar`, `Selesai`. Simpan sebagai enum dan validasi
(`Rule::in`), supaya nilai tak dikenal tidak masuk database.

### 4.6 `GET /api/v1/catalog` → `OwnerCatalogService[]`

```json
{
  "id": "srv-basic",
  "name": "Basic",
  "description": "Jasa cuci luar dan dalam",
  "category": "Cleaning",
  "price": 65000,
  "estimate": "2–3 Hari",
  "active": true,
  "image": "https://...",
  "sequence": 5
}
```

`POST/PATCH` menerima field yang sama tanpa `id`/`sequence` (server yang
mengisi). `DELETE` cukup membalas `{ success: true, message: "Layanan dihapus", data: null }`.

Catatan: form katalog mengirim gambar sebagai data URL base64 (hasil kompresi di
browser, ≤ 5 MB). Backend perlu menerima `image` berupa string panjang, lalu
menyimpannya ke storage dan mengembalikan URL publik — jangan simpan base64 di
kolom teks biasa.

### 4.7 `GET /api/v1/reviews` → `OwnerReview[]`

```json
{
  "id": "review-1",
  "name": "Budi Santoso",
  "orderId": "ORD-9921",
  "rating": 5,
  "comment": "Hasilnya sangat memuaskan!",
  "service": "Deep Cleaning",
  "status": "Dipublikasikan",
  "avatar": "https://...",
  "postedAt": "2026-05-15T00:00:00Z",
  "ownerReply": "Terima kasih!"
}
```

- `status` ∈ `Dipublikasikan | Menunggu | Dilaporkan | Disembunyikan`.
- `rating` bilangan bulat 1–5.
- `ownerReply` opsional, maksimal 500 karakter.
- Endpoint moderasi menerima `{ "status": "Disembunyikan" }`; balasan owner
  menerima `{ "reply": "..." }`.

### 4.8 `GET /api/v1/dashboard/summary`

Frontend menghitung metrik dari data mentah, jadi cukup sediakan angka agregat:

```json
{
  "success": true,
  "message": "Ringkasan dashboard",
  "data": {
    "totalRevenue": 12450000,
    "newOrders": 142,
    "activeCustomers": 856,
    "queueCount": 12,
    "revenueSeries": [{ "month": "2026-04", "total": 3500000 }],
    "orderSeries": [{ "month": "2026-04", "total": 45 }],
    "serviceSummary": [
      { "name": "Deep Cleaning", "units": 84 },
      { "name": "Unyellowing", "units": 48 }
    ]
  }
}
```

`revenueSeries`/`orderSeries` kosong (`[]`) saat belum ada data — chart akan
menampilkan empty state, bukan garis palsu.

### 4.9 `POST /api/v1/auth/login`

```json
{ "email": "owner@eatersive.id", "password": "..." }
```

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "1|abcdef...",
    "user": { "id": 1, "name": "Admin EaterSive", "email": "owner@eatersive.id", "role": "owner" }
  }
}
```

`role` ∈ `owner | user`. Frontend menyimpan sesi di `localStorage` (ingat saya)
atau `sessionStorage` (`src/auth/authStorage.ts`) dan mengirim token lewat header
`Authorization: Bearer <token>`.

---

## 5. Contoh Implementasi di Backend

### 5.1 Daftar route (`backend/routes/api.php`)

```php
<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PingController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\ServiceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class)->name('api.v1.health');
    Route::get('/ping', PingController::class)->name('api.v1.ping');

    // Publik
    Route::get('/services', [ServiceController::class, 'index'])->name('api.v1.services.index');
    Route::get('/services/{service:slug}', [ServiceController::class, 'show'])->name('api.v1.services.show');
    Route::post('/orders', [OrderController::class, 'store'])->name('api.v1.orders.store');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->name('api.v1.orders.show');
    Route::post('/orders/{order}/reviews', [ReviewController::class, 'store'])
        ->name('api.v1.orders.reviews.store');

    Route::post('/auth/login', [AuthController::class, 'login'])->name('api.v1.auth.login');

    // Owner (butuh token + role owner)
    Route::middleware(['auth:sanctum', 'role:owner'])->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me'])->name('api.v1.auth.me');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');

        Route::get('/dashboard/summary', DashboardController::class)->name('api.v1.dashboard.summary');

        Route::get('/orders', [OrderController::class, 'index'])->name('api.v1.orders.index');
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus'])
            ->name('api.v1.orders.status');

        Route::get('/catalog', [CatalogController::class, 'index'])->name('api.v1.catalog.index');
        Route::post('/catalog', [CatalogController::class, 'store'])->name('api.v1.catalog.store');
        Route::match(['put', 'patch'], '/catalog/{service:slug}', [CatalogController::class, 'update'])
            ->name('api.v1.catalog.update');
        Route::delete('/catalog/{service:slug}', [CatalogController::class, 'destroy'])
            ->name('api.v1.catalog.destroy');

        Route::get('/reviews', [ReviewController::class, 'index'])->name('api.v1.reviews.index');
        Route::patch('/reviews/{review}/status', [ReviewController::class, 'updateStatus'])
            ->name('api.v1.reviews.status');
        Route::put('/reviews/{review}/reply', [ReviewController::class, 'reply'])
            ->name('api.v1.reviews.reply');
    });
});
```

Route katalog ditulis eksplisit (bukan `apiResource`) agar nama parameter
`{service:slug}` sama dengan path yang dipakai frontend dan tidak bergantung
pada nama parameter hasil `apiResource` (`{catalog}`).

Yang **sudah tersedia** di repo (jangan dibuat ulang):

- `auth:sanctum` — Sanctum terpasang dan dipakai di `routes/api.php`.
- Alias middleware role bernama **`admin`** (`App\Http\Middleware\AdminMiddleware`),
  bukan `role:owner`. Bagian `role:owner` di contoh bawah hanya ilustrasi target.
- CRUD layanan ada di `LayananController` (`/layanan`), bukan `CatalogController`.

Contoh `role:owner` berikut berlaku **setelah** kontrak dokumen ini diadopsi:

  ```php
  ->withMiddleware(function (Middleware $middleware): void {
      $middleware->alias(['role' => \App\Http\Middleware\EnsureUserHasRole::class]);
  })
  ```

  Tanpa langkah ini, `route:list` akan gagal dengan pesan middleware `role`
  tidak ditemukan.

### 5.2 Bentuk controller (contoh `ServiceController`)

```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Service;
use Illuminate\Http\JsonResponse;

class ServiceController
{
    public function index(): JsonResponse
    {
        $services = Service::query()
            ->where('active', true)
            ->orderBy('sequence')
            ->get()
            ->map(fn (Service $service): array => [
                'id' => $service->slug,
                'name' => $service->name,
                'description' => $service->description,
                'category' => $service->category,
                'price' => $service->price,
                'priceLabel' => $service->price_label,
                'estimate' => $service->estimate,
                'rating' => (float) $service->rating,
                'reviewCount' => $service->review_count,
                'image' => $service->image_url,
                'thumbnail' => $service->thumbnail_url,
                'search' => $service->search_keywords,
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Daftar layanan',
            'data' => $services,
        ]);
    }
}
```

Pola yang sama untuk resource lain: ambil model → map ke camelCase → bungkus
`{ success, message, data }`. Untuk data besar, gunakan `JsonResource` dan
`->resolve()` agar mapping tetap rapi.

### 5.3 Feature test (wajib untuk tiap endpoint)

Ikuti pola `backend/tests/Feature/Api/PingTest.php`:

```php
public function test_services_index_returns_catalog(): void
{
    Service::factory()->create(['active' => true]);

    $this->getJson('/api/v1/services')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonStructure(['success', 'message', 'data' => [['id', 'name', 'price']]]);
}

public function test_services_index_requires_no_auth(): void
{
    $this->getJson('/api/v1/services')->assertOk();
}

public function test_owner_endpoints_reject_guest(): void
{
    $this->getJson('/api/v1/orders')->assertUnauthorized();
}
```

---

## 6. Yang Perlu Dilakukan di Frontend Setelah Route Ada

Bagian ini hanya informasi; dikerjakan di sisi frontend setelah kontrak
disepakati. Backend tidak perlu mengubah apa pun di `frontend/`.

1. Tambah fungsi di `src/api/`:

   ```ts
   // src/api/services.ts
   import { apiClient } from './client';
   import type { ApiResponse } from '../types/api';
   import type { CatalogService } from '../types/eatersive';

   export async function fetchServices(signal?: AbortSignal) {
     const response = await apiClient.get<ApiResponse<CatalogService[]>>('/services', { signal });
     return response.data.data;
   }
   ```

2. Ganti impor `SERVICES`/`OWNER_ORDERS`/`DEFAULT_OWNER_SERVICES`/
   `readOwnerReviews` di halaman menjadi state hasil `useEffect` + fungsi di atas.
3. Empty state yang sekarang tampil otomatis berganti menjadi konten nyata.
4. Hapus `src/data/*` yang sudah tidak dipakai, dan ganti `src/data/demoAccounts.ts`
   dengan sesi dari `POST /api/v1/auth/login`.

Urutan pengerjaan yang disarankan (paling kecil risikonya): `GET /services` →
`GET /orders` + `GET /orders/{id}` → `POST /orders` → katalog CRUD → ulasan →
dashboard → autentikasi.

---

## 7. Prasyarat Environment

`backend/.env`:

```env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173,http://127.0.0.1:5173
DB_CONNECTION=mysql
DB_DATABASE=laravel_react_template
```

`frontend/.env` (salin dari `.env.example`):

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Karena `VITE_API_BASE_URL` sudah memuat `/api/v1`, fungsi API cukup memanggil
`'/services'`, bukan `'/api/v1/services'`. Jangan membuat instance Axios kedua di
komponen; selalu pakai `apiClient`.

---

## 8. Verifikasi

```bash
# 1. Route terdaftar
cd backend
php artisan route:list --path=api -v

# 2. Test backend
php artisan test

# 3. Cek response + header CORS (harus ada Access-Control-Allow-Origin)
curl -i -H "Origin: http://localhost:5173" http://127.0.0.1:8000/api/v1/services

# 4. Pastikan error tetap JSON
curl -i http://127.0.0.1:8000/api/v1/tidak-ada        # 404 JSON
curl -i -X POST http://127.0.0.1:8000/api/v1/orders   # 422 JSON (validasi)

# 5. Cek dari sisi frontend
cd ../frontend
npm run lint && npm run typecheck && npm run build
```

Contoh output `route:list` yang diharapkan setelah route ditambahkan:

```text
GET|HEAD   api/v1/services ................. api.v1.services.index › Api\V1\ServiceController@index
POST       api/v1/orders ................... api.v1.orders.store  › Api\V1\OrderController@store
GET|HEAD   api/v1/orders/{order} ........... api.v1.orders.show   › Api\V1\OrderController@show
...
```

---

## 9. Kesalahan yang Sering Terjadi

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| `419 CSRF token mismatch` | Endpoint didaftarkan di `routes/web.php` | Pindahkan ke `routes/api.php` |
| `404` di `/api/api/v1/...` | Menulis `/api` manual di `routes/api.php` | Cukup `/v1`, prefix `/api` otomatis |
| Response 200 tapi frontend CORS error | Origin tidak ada di `FRONTEND_URL` | Perbarui `.env`, `php artisan config:clear`, restart |
| Field `undefined` di React | Kunci snake_case (`created_at`) | Map ke camelCase di controller/Resource |
| Tanggal salah / `Invalid Date` | Tanggal sudah diformat string Indonesia | Kirim ISO 8601 (`->toIso8601String()`) |
| Total pembayaran beda dengan UI | Frontend mengirim nominal | Backend hitung ulang dari harga layanan di DB |
| Owner bisa membuka data owner lain | Guard hanya di client (`RequireRole`) | Tambah middleware `auth:sanctum` + `role:owner` di grup route owner |
| `413 Payload Too Large` saat simpan katalog | Base64 foto > batas PHP/nginx | Naikkan `upload_max_filesize`/`post_max_size`, atau terima URL hasil upload terpisah |
| `Target class [role] does not exist` | Alias middleware `role` belum didaftarkan | Daftarkan alias di `bootstrap/app.php` (lihat 5.1) |

---

## 10. Konsistensi dengan Dokumen Lain

Bagian yang **sudah sama** dengan `docs/ROUTING.md` dan kode backend saat ini:

| Hal | Nilai | Sumber |
| --- | --- | --- |
| Prefix API | `/api` otomatis + `/v1` dari `routes/api.php` | `bootstrap/app.php`, `routes/api.php` |
| Endpoint yang ada | `GET /api/v1/health` (`api.v1.health`), `GET /api/v1/ping` (`api.v1.ping`) | `routes/api.php` |
| Nama route | `api.v1.<resource>.<action>` | `routes/api.php`, `docs/ROUTING.md` §6.1 |
| Envelope | `{ success, message, data }` | `HealthController`, `PingController` |
| Base URL frontend | `VITE_API_BASE_URL` sudah memuat `/api/v1` | `frontend/.env.example`, `docs/ROUTING.md` §4.1 |
| Error API | JSON untuk `api/*` | `bootstrap/app.php` |
| CORS | `paths => ['api/*']`, origin dari `FRONTEND_URL` | `config/cors.php` |
| Route web | Hanya `GET /` untuk `welcome` | `routes/web.php` |

Yang **berbeda / perlu diperhatikan**:

- Endpoint auth, layanan, dan `POST /reviews` **sudah ada** (lihat `docs/API.md`).
  Yang masih usulan: `services`, `orders`, `catalog`, `dashboard`, dan
  `reviews` index/moderasi/balasan.
- `docs/ROUTING.md` §2.2 menyebut `routes/api.php` hanya health dan ping — itu
  **sudah tidak akurat**; route auth/layanan/reviews sudah ditambahkan di sana.
- `docs/ROUTING.md` §3.3 hanya mendaftar route React template lama (`/`,
  `/about`, `/api-status`). Route sebenarnya di `frontend/src/routes/AppRoutes.tsx`
  lebih banyak (landing, login, alur pemesanan, 5 halaman owner). Untuk konvensi
  API tetap ikuti `ROUTING.md`; untuk daftar halaman ikuti `AppRoutes.tsx`.
- `docs/ROUTING.md` §2.2 menyebut controller `routes/api.php` hanya health dan ping.
  Itu masih akurat; jangan lupa perbarui `README.md` (tabel endpoint) setiap kali
  route baru ditambahkan, seperti diminta checklist di `ROUTING.md` §6.
