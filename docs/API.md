# EaterSive API

Dokumentasi API backend EaterSive (Laravel + Sanctum).

- **Base URL (lokal):** `http://127.0.0.1:8000/api/v1`
- **Format:** JSON (`Accept: application/json`)
- **Autentikasi:** Bearer token (Laravel Sanctum)
- **Versi:** v1

---

## 1. Format Response

Semua endpoint mengembalikan envelope yang sama:

```json
{
  "success": true,
  "message": "Pesan human-readable",
  "data": {}
}
```

Error validasi (HTTP 422):

```json
{
  "message": "The nama field is required. (and 1 more error)",
  "errors": {
    "nama": ["The nama field is required."]
  }
}
```

| Status | Arti |
|---|---|
| `200` | Berhasil |
| `201` | Data berhasil dibuat |
| `401` | Belum login / token tidak valid |
| `403` | Login, tetapi role tidak diizinkan (bukan admin) |
| `404` | Data tidak ditemukan |
| `422` | Validasi gagal |

---

## 2. Autentikasi

### `POST /auth/register`

Mendaftarkan akun pelanggan baru.

**Body**

```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "data": {
    "token": "1|xxxxxxxxxxxxxxxxxxxxxxxx",
    "token_type": "Bearer",
    "user": {
      "id": 3,
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "role": "user"
    }
  }
}
```

### `POST /auth/login`

**Body**

```json
{
  "email": "owner@eatersive.id",
  "password": "owner123"
}
```

**Response `200`** — sama seperti register (token + user).

**Response `422` / `401`** bila kredensial salah.

### `POST /auth/logout` 🔒

Mencabut **semua** token milik user.

Header: `Authorization: Bearer <token>`

**Response `200`**

```json
{ "success": true, "message": "Logout berhasil", "data": null }
```

### `GET /auth/me` 🔒

**Response `200`**

```json
{
  "success": true,
  "message": "User berhasil diambil",
  "data": {
    "user": { "id": 2, "name": "Admin EaterSive", "email": "owner@eatersive.id", "role": "admin" }
  }
}
```

> Catatan: `data` berbentuk objek `{ user }`, bukan user langsung.

> 🔒 = butuh header `Authorization: Bearer <token>`.

---

## 3. Katalog Layanan

Model `daftar_layanan` (tabel `daftar_layanans`):

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | integer | Primary key |
| `nama` | string | Nama layanan |
| `deskripsi` | string \| null | Deskripsi |
| `harga` | string (decimal) | Contoh `"35000.00"` — konversi dengan `Number()` di frontend |
| `kategori` | string | `Cleaning` \| `Treatment` \| `Repair` \| `Unyellowing` |
| `estimasi` | string | Contoh `2–3 Hari` |
| `aktif` | boolean | `false` = disembunyikan dari katalog publik |
| `foto` | string \| null | URL gambar atau data URL (base64) |
| `created_at` / `updated_at` | ISO 8601 | Timestamp |

### `GET /layanan` — publik

Mengembalikan **semua** layanan (termasuk yang `aktif = false`).
Frontend katalog publik menyaring sendiri yang `aktif = false`.

**Response `200`**

```json
{
  "success": true,
  "message": "Daftar layanan berhasil diambil",
  "data": [
    {
      "id": 1,
      "foto": null,
      "nama": "Basic",
      "deskripsi": "Jasa cuci luar dan dalam",
      "kategori": "Cleaning",
      "estimasi": "2–3 Hari",
      "aktif": true,
      "harga": "35000.00",
      "created_at": "2026-10-29T03:29:35.000000Z",
      "updated_at": "2026-10-29T03:29:35.000000Z"
    }
  ]
}
```

### `GET /layanan/{id}` — publik

**Response `200`** — satu objek layanan pada `data`.
**Response `404`** bila tidak ada.

### `POST /layanan` 🔒 Admin

**Body**

```json
{
  "nama": "Deep Cleaning",
  "deskripsi": "Pembersihan menyeluruh",
  "harga": 75000,
  "kategori": "Cleaning",
  "estimasi": "3–4 Hari",
  "aktif": true,
  "foto": null
}
```

| Field | Validasi |
|---|---|
| `nama` | wajib, string, max 255 |
| `harga` | wajib, numeric, min 0 |
| `deskripsi` | opsional, string |
| `kategori` | opsional, string, max 50 (default `Cleaning`) |
| `estimasi` | opsional, string, max 50 (default `2–3 Hari`) |
| `aktif` | opsional, boolean (default `true`) |
| `foto` | opsional, string (URL atau base64) |

**Response `201`** — objek layanan yang dibuat.

**Response `403`** bila token milik role `user`.
**Response `401`** bila tanpa token.

### `PUT /layanan/{id}` 🔒 Admin

Body sama seperti `POST`, semua field opsional (`sometimes`).

**Response `200`** — objek layanan terbaru (`data`).

### `DELETE /layanan/{id}` 🔒 Admin

**Response `200`**

```json
{ "success": true, "message": "Layanan berhasil dihapus", "data": null }
```

---

## 4. Review

Model `Riview` (tabel `riviews`): `id`, `isi_review`, `user_id`, `layanan_id`, timestamps.

### `POST /reviews` 🔒

**Body**

```json
{
  "layanan_id": 1,
  "isi_review": "Cuci cepat dan bersih"
}
```

| Field | Validasi |
|---|---|
| `layanan_id` | wajib, harus ada di `daftar_layanans.id` |
| `isi_review` | wajib, string, max 255 |

`user_id` diambil otomatis dari token (tidak dikirim client).

**Response `201`**

```json
{
  "success": true,
  "message": "Review berhasil disimpan",
  "data": {
    "id": 1,
    "user_id": 2,
    "layanan_id": 1,
    "isi_review": "Cuci cepat dan bersih",
    "updated_at": "2026-10-29T03:40:00.000000Z",
    "created_at": "2026-10-29T03:40:00.000000Z"
  }
}
```

> Endpoint daftar review (`GET /reviews/layanan/{id}`) **belum tersedia**.

---

## 5. Health Check

### `GET /health` — publik

```json
{ "success": true, "message": "Backend berjalan", "data": { "status": "ok" } }
```

---

## 6. Akun Hasil Seeder

| Role | Email | Password |
|---|---|---|
| Admin/Owner | `owner@eatersive.id` | `owner123` |
| Pelanggan | `user@eatersive.id` | `user123` |

Jalankan: `php artisan migrate --seed`

---

## 7. Integrasi Frontend

| Item | Nilai |
|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api/v1` |
| Header auth | `Authorization: Bearer <token>` |
| Penyimpanan token | `localStorage`/`sessionStorage` key `eatersive-auth-session` |
| CORS | `FRONTEND_URL` di `backend/.env` (default `http://localhost:5173,http://127.0.0.1:5173`) |

Pemetaan field backend → UI:

| Backend | UI (`CatalogService`) |
|---|---|
| `id` | `id` (diubah ke string) |
| `nama` | `name` |
| `deskripsi` | `description` |
| `harga` | `price` (Number) |
| `kategori` | `category` |
| `estimasi` | `estimate` |
| `foto` | `image` / `thumbnail` |
| `aktif` | menentukan tampil/tidak di katalog publik |

File frontend terkait:

- `src/api/client.ts` — axios + interceptor Bearer + handler 401
- `src/api/auth.ts` — login / register / logout / me
- `src/api/layanan.ts` — CRUD layanan + mapper
- `src/lib/catalog-store.ts` — cache katalog + hook `useCatalog()`
- `src/auth/AuthProvider.tsx` — sesi login berbasis Sanctum

Catatan:

- Role backend `admin` dipetakan ke role UI `owner`.
- `harga` dikirim sebagai string decimal (`"35000.00"`) — selalu konversi dengan `Number()`.
- Nilai `foto` base64 bisa besar; sebaiknya gunakan URL gambar untuk produksi.

---

## 8. Belum Tersedia (di luar cakupan saat ini)

Endpoint berikut **belum diimplementasikan**:

- `POST /pesanan`, `GET /pesanan`, `GET /pesanan/my-orders`, `GET /pesanan/{id}`, `PATCH /pesanan/{id}/status`
- `POST /pembayaran/charge`, `POST /pembayaran/webhook`, `GET /pembayaran/{id}`
- `GET /reviews/layanan/{layanan_id}`

---

## 9. Verifikasi

```bash
cd backend
php artisan migrate --seed
php artisan test
php artisan route:list --path=api
```

```bash
cd frontend
npm run lint
npm run build
```

> ⚠️ `php artisan test` memakai `RefreshDatabase` sehingga **mengosongkan database**. Setelah menjalankan test, jalankan `php artisan db:seed` lagi.
