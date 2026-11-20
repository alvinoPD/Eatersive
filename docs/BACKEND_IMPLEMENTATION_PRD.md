# Backend Implementation PRD — EaterSive

Dokumen ini adalah **rujukan implementasi backend** untuk tiga kebutuhan yang saling berkaitan:

1. **Riwayat booking pelanggan** — pesanan yang sudah dibuat harus tetap bisa dilihat setelah pengguna kembali ke homepage atau berpindah menu.
2. **Pengaturan akun owner** — tombol *Pengaturan* di sidebar dashboard owner (dekat tombol *Keluar*) harus berfungsi.
3. **Akses tracking pesanan** — halaman lacak progress tidak boleh hanya bisa dibuka dari halaman konfirmasi booking.

Isi dokumen disusun dari **kondisi nyata source code di folder `backend/`** (route, controller, model, migrasi, konfigurasi auth), bukan dari asumsi. Dokumen PRD lama (`docs/PRD.md`, `docs/backend_prd.md`) dipakai sebagai acuan fitur, tetapi **implementasi nyata menang** saat ada perbedaan penamaan.

> Status dokumen: **spesifikasi + catatan implementasi**.
> Ketiga fitur sudah diimplementasikan di backend dan frontend. Migrasi sudah dijalankan pada MySQL `Eatersive` dan diverifikasi lewat HTTP; test otomatis berjalan di SQLite in-memory. Migrasi dibuat idempoten agar aman bila sebagian kolom sudah ada.

### Status implementasi

| Bagian | Status |
| :--- | :--- |
| 4 migrasi aditif (§5) | selesai (file dibuat, diuji lewat `RefreshDatabase` SQLite) |
| Model + relasi `statusHistories` (§6) | selesai |
| `GET/POST /orders`, `GET /orders/{id}`, `PATCH /orders/{id}/status` | selesai |
| `GET /owner/orders`, `GET /owner/dashboard`, profil & password owner | selesai |
| Halaman `/pesanan-saya` + link navigasi | selesai |
| Halaman `/owner/settings` + link sidebar | selesai |
| Tracking `/lacak-pesanan?order={id}` dari API | selesai |
| Checkout menyimpan pesanan ke server | selesai |
| Integrasi payment gateway (F-02) | belum (di luar 3 fitur) |
| Rating ulasan di `riviews` (F-03) | belum (di luar 3 fitur) |
| `php artisan migrate` pada MySQL `Eatersive` | selesai (4 migrasi batch baru) |

---

## 1. Ringkasan Kondisi Backend Saat Ini

| Aspek | Kondisi nyata |
| :--- | :--- |
| Framework | Laravel `^13.17`, PHP `^8.3` |
| Autentikasi | Laravel Sanctum (`auth:sanctum`), token Bearer |
| Role | Kolom `users.role`, nilai nyata: `admin` dan `user` (default `user`) |
| Middleware role | Alias `admin` → `App\Http\Middleware\AdminMiddleware` di `bootstrap/app.php` |
| Prefix API | `/api` otomatis + `/v1` manual → `/api/v1/*` |
| Envelope response | `{ success, message, data }` (error memakai `data: null`) |
| Database | MySQL, database `Eatersive` (dari `backend/.env`), test memakai SQLite `:memory:` |
| Tabel nyata | `users`, `daftar_layanans`, `pesanan`, `pembayarans`, `riviews`, `personal_access_tokens` |
| Model nyata | `User`, `daftar_layanan`, `Pesanan`, `Pembayaran`, `Riview` |
| Controller nyata | `Authcontroller`, `LayananController`, `PesananController` (stub), `PembayaranController` (stub), `RiviewController` (hanya `store`), `Api\V1\HealthController`, `Api\V1\PingController` |

### 1.1 Route yang benar-benar terdaftar

Hasil `php artisan route:list --path=api`:

| Method | Endpoint | Nama route | Middleware | Status |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/v1/auth/register` | `api.v1.auth.register` | publik | ada |
| POST | `/api/v1/auth/login` | `api.v1.auth.login` | publik | ada |
| POST | `/api/v1/auth/logout` | `api.v1.auth.logout` | `auth:sanctum` | ada |
| GET | `/api/v1/auth/me` | `api.v1.auth.me` | `auth:sanctum` | ada |
| GET | `/api/v1/layanan` | `api.v1.layanan.index` | publik | ada |
| GET | `/api/v1/layanan/{id}` | `api.v1.layanan.show` | publik | ada |
| POST | `/api/v1/layanan` | `api.v1.layanan.store` | `auth:sanctum`, `admin` | ada |
| PUT | `/api/v1/layanan/{id}` | `api.v1.layanan.update` | `auth:sanctum`, `admin` | ada |
| DELETE | `/api/v1/layanan/{id}` | `api.v1.layanan.destroy` | `auth:sanctum`, `admin` | ada |
| POST | `/api/v1/reviews` | `api.v1.reviews.store` | `auth:sanctum` | ada |
| GET | `/api/v1/health` | `api.v1.health` | publik | ada |
| GET | `/api/v1/ping` | `api.v1.ping` | publik | ada |

**Tidak ada** route untuk pesanan, pembayaran, dashboard, maupun profil owner. Ini akar dari ketiga masalah.

### 1.2 Struktur tabel yang ada (terverifikasi dari migrasi)

```
users
  id, name, email (unique), email_verified_at, password,
  remember_token, role (default 'user'), timestamps

daftar_layanans
  id, foto (nullable), nama, deskripsi (nullable), harga (float), timestamps

pesanan
  id, foto (nullable), nama, nomor_telp (nullable), alamat (nullable),
  status (default 'pending'),
  user_id -> users (cascade), layanan_id -> daftar_layanans (cascade),
  timestamps

pembayarans
  id, pesanan_id -> pesanan (cascade),
  metode_pembayaran (nullable), status_pembayaran (default 'pending'),
  jumlah (float), transaction_id (nullable), tanggal_bayar (nullable),
  timestamps

riviews
  id, isi_review, user_id -> users (cascade),
  layanan_id -> daftar_layanans (cascade), timestamps
```

### 1.3 Relasi model yang sudah ada

```
User      hasMany Pesanan, hasMany Riview
Pesanan   belongsTo User, belongsTo daftar_layanan, hasOne Pembayaran
Pembayaran belongsTo Pesanan
Riview    belongsTo User, belongsTo daftar_layanan
daftar_layanan hasMany Pesanan, hasMany Riview
```

Catatan penamaan yang **wajib dipertahankan**:

- Model layanan bernama `daftar_layanan` (huruf kecil), tabel `daftar_layanans`.
- Model ulasan bernama `Riview`, tabel `riviews`.
- Tabel pesanan bernama `pesanan` (tanpa `s`).
- Kolom pesanan memakai `nomor_telp` (bukan `nomor_telpon` seperti di ERD PRD).

---

## 2. Pemetaan PRD ke Kondisi Nyata

| Fitur PRD | Kebutuhan | Kondisi backend | Keterkaitan dengan 3 task |
| :--- | :--- | :--- | :--- |
| F-01 Pemesanan Online | Customer memilih layanan, mengisi detail, membuat pesanan | `PesananController` stub, tanpa route | **Task 1 & 3** — sumber data riwayat dan tracking |
| F-02 Pembayaran Online | Gateway + webhook | `PembayaranController` stub, tanpa route | Task 1 hanya **membaca** status pembayaran, bukan memproses |
| F-03 Ulasan & Rating | Rating 1–5, ulasan per layanan | Hanya `POST /reviews`, tanpa `rating` | Di luar cakupan 3 task |
| F-04 Dashboard Pemantauan | Metrik & daftar pesanan owner | Belum ada endpoint, UI memakai array kosong | **Task 1 & 2** — owner butuh daftar pesanan dan profil |
| F-05 Manajemen Katalog | CRUD layanan + harga | Sudah jalan, tetapi field `kategori/estimasi/aktif` hilang | Prasyarat tampilan layanan pada riwayat/tracking |
| F-06 Pemrosesan Pesanan | Owner mengubah status | Belum ada endpoint, UI memakai `localStorage` | **Task 3** — status tracking harus dari DB |

Kesimpulan: ketiga task **tidak boleh** diselesaikan dengan menambah data dummy di frontend. Sumber kebenaran harus tabel `pesanan` + tabel riwayat status baru.

---

## 3. Analisis Tiga Masalah

### 3.1 Riwayat booking tidak bisa diakses

**Gejala.** Setelah checkout, data hanya disimpan di `sessionStorage` (`eatersive-confirmation-order`) dan halaman konfirmasi membacanya sekali. Begitu pengguna kembali ke `/` atau membuka menu lain, tidak ada halaman yang menampilkan pesanan tersebut.

**Akar masalah di backend.**

- `PesananController@index`, `@store`, `@show` masih kosong.
- Belum ada route `GET /api/v1/orders`.
- Tabel `pesanan` belum menyimpan kode pesanan yang layak ditampilkan, jumlah item, total harga, maupun estimasi selesai.

**Dampak.** Tidak ada data pesanan yang bisa diambil ulang; refresh browser menghilangkan konteks.

### 3.2 Tombol Pengaturan owner tidak berfungsi

**Gejala.** Di `frontend/src/components/owner/OwnerShell.tsx`, item *Pengaturan* masih berupa `<a href="#pengaturan">` yang hanya menggulir halaman. Tidak ada halaman, route, atau endpoint.

**Akar masalah di backend.**

- Tidak ada endpoint profil/password owner.
- Tabel `users` belum punya kolom nomor telepon, padahal PRD mencantumkan `nomor_telpon`.
- Belum ada halaman frontend `/owner/settings` di grup `RequireRole role="owner"`.

### 3.3 Tracking hanya bisa diakses dari halaman booking

**Gejala.** Tombol *Lacak Status Pesanan* hanya ada di `/konfirmasi-pesanan`, dan `/lacak-pesanan` mengambil data dari `sessionStorage`, lalu menghitung progress dari selisih waktu (`elapsedMinutes`) — bukan status nyata.

**Akar masalah di backend.**

- Tidak ada endpoint detail pesanan yang mengembalikan status terkini.
- Tidak ada tabel riwayat status, sehingga timeline tidak punya sumber data.
- Tidak ada validasi kepemilikan pesanan pada level API.

---

## 4. Keputusan Desain

| No | Keputusan | Alasan |
| :--- | :--- | :--- |
| D1 | Semua perubahan skema bersifat **aditif** (tambah kolom/tabel), tanpa rename/drop | Menjaga aturan proyek: jangan rename `daftar_layanans`/`riviews`, jangan `migrate:fresh` |
| D2 | Satu baris `pesanan` = satu layanan (sesuai ERD PRD `pesanan.layanan_id`) | Menghindari tabel detail baru dan menjaga kompatibilitas model |
| D3 | Checkout multi-layanan membuat **beberapa baris** `pesanan` dengan `kode_grup` yang sama | Halaman konfirmasi tetap punya satu identitas grup, sementara tiap layanan punya status sendiri |
| D4 | Status pesanan disimpan sebagai string dengan daftar nilai yang divalidasi di aplikasi | Kolom `status` sudah `string`; enum DB akan mempersulit perubahan |
| D5 | Riwayat status disimpan di tabel baru `pesanan_status_histories` | Tracking butuh timestamp nyata per perubahan, bukan simulasi waktu |
| D6 | Nomor telepon owner memakai nama kolom `nomor_telp` | Konsisten dengan `pesanan.nomor_telp`; PRD menulis `nomor_telpon` tetapi implementasi nyata memakai `nomor_telp` |
| D7 | Tracking memakai `pesanan.id` di URL, bukan kode pesanan | Cukup satu endpoint detail; keamanan tetap dijaga lewat pengecekan kepemilikan |
| D8 | Endpoint owner memakai prefix `/api/v1/owner/*` | Memisahkan hak akses admin dari endpoint customer, sesuai konvensi route yang sudah ada |
| D9 | Total harga **selalu dihitung backend** dari `daftar_layanans.harga × jumlah` | Frontend tidak boleh menentukan nominal |
| D10 | `pembayaran` tetap satu baris per pesanan (`hasOne`) | Sesuai migrasi dan model yang sudah ada |

---

## 5. Perubahan Database

Semua migrasi baru, tidak menyentuh migrasi lama. Nama file mengikuti tanggal berjalan.

### 5.1 Migrasi 1 — atribut katalog

`database/migrations/xxxx_xx_xx_xxxxxx_add_catalog_attributes_to_daftar_layanans_table.php`

| Kolom | Tipe | Nullable | Default | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| `kategori` | `string(32)` | ya | `null` | Nilai UI: `Cleaning`, `Treatment`, `Repair`, `Unyellowing` |
| `estimasi` | `string(64)` | ya | `null` | Contoh `2–3 Hari` |
| `aktif` | `boolean` | tidak | `true` | Layanan nonaktif tidak boleh dipesan |

Alasan: frontend (`src/api/layanan.ts`, `OwnerCatalogPage`) sudah mengirim dan membaca ketiga field ini, tetapi backend membuangnya. Tanpa kolom ini, data riwayat/tracking akan menampilkan kategori dan estimasi palsu (default `Cleaning`, `2–3 Hari`).

### 5.2 Migrasi 2 — field booking pada `pesanan`

`database/migrations/xxxx_xx_xx_xxxxxx_add_booking_fields_to_pesanan_table.php`

| Kolom | Tipe | Nullable | Default | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| `kode_pesanan` | `string(24)` unique | ya | `null` | Nomor pesanan tampilan, mis. `ETS-261106-0012` |
| `kode_grup` | `string(24)` index | ya | `null` | Sama untuk pesanan dari satu checkout |
| `jumlah` | `unsignedSmallInteger` | tidak | `1` | Kuantitas layanan, 1–99 |
| `total_harga` | `decimal(12,2)` | ya | `null` | Hasil hitung backend saat pembuatan |
| `catatan` | `text` | ya | `null` | Catatan pelanggan |
| `estimasi_selesai` | `date` | ya | `null` | Diisi dari `created_at + estimasi` bila tersedia |

Tambahan index: `status`, `created_at`.

`kode_pesanan` dan `kode_grup` nullable agar baris lama (jika ada) tetap valid. Unique index pada `kode_pesanan` aman karena MySQL/SQLite mengizinkan banyak `NULL`.

### 5.3 Migrasi 3 — tabel riwayat status

`database/migrations/xxxx_xx_xx_xxxxxx_create_pesanan_status_histories_table.php`

```
pesanan_status_histories
  id
  pesanan_id  foreignId -> pesanan.id, cascadeOnDelete
  status      string(20)
  catatan     text nullable
  changed_by  foreignId nullable -> users.id, nullOnDelete   // null = sistem
  created_at, updated_at
  index (pesanan_id, created_at)
```

Alasan: timeline tracking harus berasal dari event nyata. Satu baris ditulis setiap kali pesanan dibuat atau statusnya diubah.

### 5.4 Migrasi 4 — nomor telepon owner

`database/migrations/xxxx_xx_xx_xxxxxx_add_nomor_telp_to_users_table.php`

| Kolom | Tipe | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `nomor_telp` | `string(20)` | ya | `null` |

Catatan: PRD menulis `nomor_telpon`; nama `nomor_telp` dipilih agar konsisten dengan kolom yang sudah dipakai di `pesanan`.

### 5.5 Yang **tidak** diubah

- `riviews` (tidak ada rating) — di luar cakupan 3 task, jangan diubah agar F-03 tidak setengah jalan.
- `pembayarans` — struktur sudah cukup untuk menampilkan status pembayaran; integrasi gateway tetap pekerjaan F-02 terpisah.
- Nama tabel, nama model, dan route yang sudah ada.

### 5.6 Rollback

Setiap migrasi menyediakan `down()` yang hanya menghapus kolom/tabel yang ditambahkan migrasi tersebut. Tidak ada operasi yang menghapus data lama.

---

## 6. Perubahan Model

| File | Perubahan |
| :--- | :--- |
| `app/Models/daftar_layanan.php` | tambah `kategori`, `estimasi`, `aktif` ke `$fillable`; cast `aktif` → `boolean` |
| `app/Models/Pesanan.php` | tambah `kode_pesanan`, `kode_grup`, `jumlah`, `total_harga`, `catatan`, `estimasi_selesai` ke `$fillable`; cast `total_harga` → `decimal:2`, `estimasi_selesai` → `date`; relasi `statusHistories(): HasMany`, `review(): HasOne` (opsional, jangan dipakai bila `riviews` belum berubah) |
| `app/Models/User.php` | tambah `nomor_telp` ke atribut `Fillable` |
| `app/Models/PesananStatusHistory.php` *(baru)* | `$fillable = ['pesanan_id','status','catatan','changed_by']`; relasi `pesanan()`, `changedBy()` |

`Pembayaran` dan `Riview` tidak berubah.

---

## 7. Kontrak API

Semua endpoint mengikuti envelope yang sama:

```json
{ "success": true, "message": "…", "data": {} }
```

Error validasi memakai format bawaan Laravel (`message` + `errors`) dengan status `422`; envelope `success: false, data: null` dipakai untuk error yang dibuat manual (401/403/404/409).

### 7.1 Daftar pesanan milik customer

```
GET /api/v1/orders
Middleware: auth:sanctum
Query (opsional): status, per_page (default 10, maks 50), page
```

Hanya mengembalikan `pesanan` dengan `user_id = auth()->id()`. Query string `user_id` dari frontend **diabaikan**.

Contoh response `200`:

```json
{
  "success": true,
  "message": "Daftar pesanan berhasil diambil",
  "data": [
    {
      "id": 12,
      "kode_pesanan": "ETS-261106-0012",
      "kode_grup": "GRP-261106-8F3A",
      "nama": "Budi Santoso",
      "nomor_telp": "081234567890",
      "alamat": "Jl. Melati No. 5, Bandung",
      "catatan": "Titip di pos keamanan",
      "status": "processing",
      "status_label": "Sedang Dikerjakan",
      "jumlah": 1,
      "total_harga": 35000,
      "estimasi_selesai": "2026-11-09",
      "created_at": "2026-11-06T10:12:00+07:00",
      "layanan": {
        "id": 3,
        "nama": "Deep Cleaning",
        "foto": "https://…",
        "kategori": "Cleaning",
        "estimasi": "2–3 Hari"
      },
      "pembayaran": {
        "id": 5,
        "metode_pembayaran": "qris",
        "status_pembayaran": "pending",
        "jumlah": 35000,
        "tanggal_bayar": null
      }
    }
  ]
}
```

### 7.2 Detail pesanan (dipakai tracking)

```
GET /api/v1/orders/{id}
Middleware: auth:sanctum
```

Aturan akses:

- `admin` → boleh melihat semua pesanan.
- `user` → hanya pesanan dengan `user_id` miliknya.
- Pesanan milik orang lain → `403`; ID tidak ada → `404`.

Response menambahkan `timeline`:

```json
{
  "success": true,
  "message": "Detail pesanan berhasil diambil",
  "data": {
    "id": 12,
    "kode_pesanan": "ETS-261106-0012",
    "status": "processing",
    "status_label": "Sedang Dikerjakan",
    "total_harga": 35000,
    "estimasi_selesai": "2026-11-09",
    "timeline": [
      {
        "status": "pending",
        "status_label": "Pesanan Diterima",
        "catatan": "Pesanan dibuat.",
        "changed_by": null,
        "created_at": "2026-11-06T10:12:00+07:00"
      },
      {
        "status": "processing",
        "status_label": "Sedang Dikerjakan",
        "catatan": "Mulai deep cleaning.",
        "changed_by": "Admin EaterSive",
        "created_at": "2026-11-06T13:40:00+07:00"
      }
    ],
    "layanan": { "id": 3, "nama": "Deep Cleaning", "kategori": "Cleaning" },
    "pembayaran": { "status_pembayaran": "pending", "jumlah": 35000 }
  }
}
```

### 7.3 Membuat pesanan

```
POST /api/v1/orders
Middleware: auth:sanctum
```

Request:

```json
{
  "layanan_id": 3,
  "jumlah": 1,
  "nama": "Budi Santoso",
  "nomor_telp": "081234567890",
  "alamat": "Jl. Melati No. 5, Bandung",
  "catatan": "Titip di pos keamanan",
  "metode_pembayaran": "qris"
}
```

Perilaku server:

1. Validasi `layanan_id` ada dan `aktif = true` (jika kolom `aktif` sudah ada).
2. Hitung `total_harga = harga × jumlah` (integer rupiah).
3. Generate `kode_pesanan` unik `ETS-YYMMDD-XXXX` dan `kode_grup` `GRP-YYMMDD-XXXX`.
4. Simpan `pesanan` dengan `status = pending` dan `user_id = auth()->id()`.
5. Tulis baris pertama `pesanan_status_histories` (`status = pending`, `changed_by = null`).
6. Buat `pembayarans` dengan `status_pembayaran = pending`, `jumlah = total_harga`.
7. Kembalikan `201` berisi objek pesanan lengkap.

Untuk checkout multi-layanan, frontend mengirim satu request per layanan dengan `kode_grup` yang sama; server menerima `kode_grup` opsional dan memakai nilai yang dikirim bila valid.

### 7.4 Daftar pesanan untuk owner

```
GET /api/v1/owner/orders
Middleware: auth:sanctum, admin
Query: status, q, per_page
```

Mengembalikan seluruh pesanan, diurutkan `created_at` terbaru, dengan bentuk item sama seperti §7.1. Filter `q` mencari `kode_pesanan`, `nama`, atau `nomor_telp`.

### 7.5 Mengubah status pesanan

```
PATCH /api/v1/orders/{id}/status
Middleware: auth:sanctum, admin
```

Request:

```json
{ "status": "processing", "catatan": "Sepatu masuk tahap deep cleaning." }
```

Perilaku server:

1. Validasi `status` termasuk nilai yang diizinkan.
2. Tolak transisi mundur/ilegal dengan `422` (contoh: `completed → processing`).
3. Update `pesanan.status`.
4. Tulis baris baru di `pesanan_status_histories` dengan `changed_by = auth()->id()`.
5. Kembalikan pesanan beserta `timeline` terbaru.

### 7.6 Ringkasan dashboard owner

```
GET /api/v1/owner/dashboard
Middleware: auth:sanctum, admin
```

```json
{
  "success": true,
  "message": "Ringkasan dashboard berhasil diambil",
  "data": {
    "total_orders": 24,
    "pending_orders": 3,
    "processing_orders": 5,
    "completed_orders": 16,
    "cancelled_orders": 0,
    "total_revenue": 875000,
    "recent_orders": [
      {
        "id": 24,
        "kode_pesanan": "ETS-261106-0024",
        "nama": "Budi Santoso",
        "layanan": "Deep Cleaning",
        "status": "processing",
        "status_label": "Sedang Dikerjakan",
        "total_harga": 35000,
        "created_at": "2026-11-06T10:12:00+07:00"
      }
    ]
  }
}
```

Definisi metrik (harus konsisten dengan data yang ada):

- `total_revenue` = `SUM(pesanan.total_harga)` untuk pesanan yang memiliki `pembayarans.status_pembayaran = 'paid'`.
- Karena webhook pembayaran belum diimplementasikan, nilai ini akan `0` sampai F-02 selesai. **Jangan** menghitung dari frontend dan jangan menandai pesanan sebagai lunas tanpa bukti gateway.
- `recent_orders` maksimal 5 baris terbaru.

### 7.7 Profil owner

```
GET /api/v1/owner/profile
PUT /api/v1/owner/profile
Middleware: auth:sanctum, admin
```

Response `GET`:

```json
{
  "success": true,
  "message": "Profil owner berhasil diambil",
  "data": {
    "id": 1,
    "name": "Admin EaterSive",
    "email": "owner@eatersive.id",
    "nomor_telp": "081234567890",
    "role": "admin",
    "created_at": "2026-10-28T09:00:00+07:00"
  }
}
```

Request `PUT` (semua field `sometimes`):

```json
{
  "name": "Admin EaterSive",
  "email": "owner@eatersive.id",
  "nomor_telp": "081234567890"
}
```

Aturan:

- Hanya mengubah `auth()->user()`; tidak ada parameter `id`/`user_id` yang dipercaya.
- Email unik, mengabaikan email milik sendiri.
- `password` dan hash-nya tidak pernah muncul di response (sudah dijaga `#[Hidden]` di model `User`).
- Setelah update, frontend memanggil ulang `/auth/me` atau memperbarui sesi lokal agar nama terbaru tampil.

### 7.8 Ubah password owner

```
PUT /api/v1/owner/password
Middleware: auth:sanctum, admin
```

```json
{
  "current_password": "password-lama",
  "password": "password-baru-yang-kuat",
  "password_confirmation": "password-baru-yang-kuat"
}
```

Aturan:

1. `current_password` diverifikasi dengan `Hash::check`.
2. Password baru minimal 8 karakter dan harus sama dengan konfirmasi.
3. Password di-hash otomatis oleh cast `hashed` pada model `User`.
4. Token lain dicabut, **token yang sedang dipakai tetap aktif** agar pengguna tidak ter-logout.
5. Salah password lama → `422` dengan pesan yang jelas.

---

## 8. Otorisasi

| Endpoint | Guest | `user` | `admin` |
| :--- | :--- | :--- | :--- |
| `GET /orders` | 401 | daftar miliknya | daftar miliknya (bukan semua) |
| `GET /orders/{id}` | 401 | hanya miliknya | semua |
| `POST /orders` | 401 | boleh | boleh |
| `PATCH /orders/{id}/status` | 401 | 403 | boleh |
| `GET /owner/orders` | 401 | 403 | boleh |
| `GET /owner/dashboard` | 401 | 403 | boleh |
| `GET/PUT /owner/profile` | 401 | 403 | boleh |
| `PUT /owner/password` | 401 | 403 | boleh |

Aturan implementasi:

- Kepemilikan **selalu** diambil dari `$request->user()->id`, bukan dari body/query.
- Middleware `admin` yang sudah ada dipakai ulang; jangan membuat mekanisme role baru.
- Gunakan `403` untuk pelanggaran role/kepemilikan, `404` untuk resource yang tidak ada.

---

## 9. Siklus Status Pesanan

Nilai kanonik di database:

| Status | Label UI | Tahap tracking | Final |
| :--- | :--- | :--- | :--- |
| `pending` | Menunggu | 1. Pesanan Diterima | tidak |
| `confirmed` | Dikonfirmasi | 2. Kurir Menuju Lokasi | tidak |
| `processing` | Sedang Dikerjakan | 3. Sedang Dibersihkan | tidak |
| `quality_check` | Pengecekan | 4. Pengecekan Kualitas | tidak |
| `completed` | Selesai | 5. Pesanan Selesai | ya |
| `cancelled` | Dibatalkan | — (keluar dari timeline) | ya |

Transisi yang diizinkan:

```
pending ──► confirmed ──► processing ──► quality_check ──► completed
   │            │             │                │
   └────────────┴─────────────┴────────────────┴──► cancelled
```

- Tidak ada transisi mundur.
- `completed` dan `cancelled` tidak bisa diubah lagi.
- Alasan pembatalan wajib dikirim lewat `catatan`.

Pemetaan ke tipe frontend yang sudah ada:

- `OwnerOrder['status']` (`'Selesai' | 'Proses'`) diturunkan: `completed → Selesai`, selain itu `Proses`.
- Opsi status di `OwnerOrderDetailPage` dipetakan ke nilai kanonik, bukan disimpan sebagai teks bebas.
- Timeline `/lacak-pesanan` (5 langkah) memakai `timeline[]` dari API, bukan `elapsedMinutes`.

---

## 10. Aturan Validasi

| Field | Endpoint | Aturan |
| :--- | :--- | :--- |
| `layanan_id` | POST /orders | `required`, `integer`, `exists:daftar_layanans,id`; tolak bila `aktif = false` |
| `jumlah` | POST /orders | `required`, `integer`, `min:1`, `max:99` |
| `nama` | POST /orders | `required`, `string`, `max:255` |
| `nomor_telp` | POST /orders | `required`, `string`, `max:20`, regex `[0-9+() -]{8,20}` |
| `alamat` | POST /orders | `required`, `string`, `max:1000` |
| `catatan` | POST /orders | `nullable`, `string`, `max:1000` |
| `metode_pembayaran` | POST /orders | `nullable`, `in:qris,va,ewallet` |
| `kode_grup` | POST /orders | `nullable`, `string`, `max:24` |
| `status` | PATCH /orders/{id}/status | `required`, `in:pending,confirmed,processing,quality_check,completed,cancelled` + cek transisi |
| `catatan` | PATCH /orders/{id}/status | `nullable`, `string`, `max:1000`; wajib bila `status = cancelled` |
| `name` | PUT /owner/profile | `sometimes`, `required`, `string`, `max:255` |
| `email` | PUT /owner/profile | `sometimes`, `required`, `email`, `max:255`, `unique:users,email,{id}` |
| `nomor_telp` | PUT /owner/profile | `sometimes`, `nullable`, `string`, `max:20` |
| `current_password` | PUT /owner/password | `required`, `string`, harus cocok |
| `password` | PUT /owner/password | `required`, `string`, `min:8`, `confirmed` |

Nominal uang disimpan sebagai integer rupiah (tanpa desimal) di DB `decimal(12,2)` dan dikirim sebagai angka pada JSON.

---

## 11. Kontrak Integrasi Frontend

Bagian ini menjelaskan bagaimana frontend yang sudah ada harus terhubung setelah backend selesai. **Tidak ada file frontend yang diubah pada pembuatan dokumen ini.**

### 11.1 Route frontend

| Route | Komponen | Guard | Keterangan |
| :--- | :--- | :--- | :--- |
| `/pesanan-saya` | `PesananSayaPage` *(baru)* | `RequireRole role="user"` *(baru)*, atau redirect ke `/login` bila belum sesi | Daftar booking dari `GET /orders` |
| `/lacak-pesanan?order={id}` | `LacakPesananPage` (diubah) | sesi diperlukan oleh API | Detail + timeline dari `GET /orders/{id}` |
| `/owner/settings` | `OwnerSettingsPage` *(baru)* | grup `RequireRole role="owner"` yang sudah ada | Profil & password |
| `/owner`, `/owner/orders`, dst. | tidak berubah | tidak berubah | Tetap seperti sekarang |

Perubahan navigasi:

- `UserHeader`: tambah link **Pesanan Saya** ke `/pesanan-saya` (tanpa mengubah layout header).
- `OwnerShell`: ubah item *Pengaturan* dari `<a href="#pengaturan">` menjadi `<Link to="/owner/settings">`, tambah `'settings'` pada `OwnerNavKey`.

### 11.2 Modul API frontend

| File *(baru)* | Fungsi | Endpoint |
| :--- | :--- | :--- |
| `src/api/orders.ts` | `fetchMyOrders`, `fetchOrderDetail`, `createOrder` | `/orders`, `/orders/{id}` |
| `src/api/owner.ts` | `fetchOwnerOrders`, `fetchOwnerDashboard`, `fetchOwnerProfile`, `updateOwnerProfile`, `changeOwnerPassword` | `/owner/*` |

Semua memakai `apiClient` yang sudah ada (jangan membuat instance Axios baru). Tipe response mengikuti `ApiResponse<T>` di `src/types/api.ts`.

### 11.3 Pemetaan field

| Backend | Frontend | Catatan |
| :--- | :--- | :--- |
| `kode_pesanan` | `orderNumber` | Ditampilkan, bukan `id` mentah |
| `created_at` (ISO 8601) | `createdAt` | Format tampilan lewat `Intl.DateTimeFormat('id-ID')` |
| `total_harga` | `total` | Angka rupiah |
| `status` | `status` | Nilai kanonik; label diambil dari `status_label` |
| `pembayaran.status_pembayaran` | `paymentStatus` | `pending`, `paid`, `expired`, `failed` |
| `estimasi_selesai` | `estimatedFinish` | Boleh `null` |

### 11.4 State yang wajib ditangani

- **Loading**: skeleton/teks "Memuat pesanan…" saat request berjalan.
- **Empty**: "Belum ada pesanan" + tautan ke `/layanan`.
- **Error**: pesan dari `getApiErrorMessage`, plus tombol coba lagi.
- **Unauthorized**: event `eatersive:unauthorized` yang sudah ada akan membersihkan sesi; halaman diarahkan ke `/login`.

### 11.5 Penghapusan sumber data lokal

Setelah endpoint tersedia:

- `src/data/ownerOrders.ts` tidak lagi menjadi sumber tampilan (boleh dihapus isinya, bukan filenya, bila masih diimpor).
- `localStorage` key `eatersive-order-progress-<id>` tidak dipakai lagi; status hanya dari API.
- `sessionStorage` `eatersive-confirmation-order` hanya untuk meneruskan data antar halaman setelah `POST /orders` berhasil. Bila hilang (refresh), halaman konfirmasi harus bisa memuat ulang dari API memakai ID pesanan, bukan menampilkan data palsu.

---

## 12. Rencana Implementasi Backend

Urutan kerja yang disarankan (tidak ada langkah destruktif):

1. **Migrasi & model** (§5, §6) — jalankan `php artisan migrate` pada database MySQL `Eatersive` setelah perubahan.
2. **`PesananController`** — `index`, `store`, `show`, `updateStatus`; helper format response agar konsisten.
3. **`OwnerDashboardController`** — agregasi metrik + `recent_orders`.
4. **`OwnerProfileController`** — `show`, `update`, `updatePassword`.
5. **Route** di `routes/api.php`:
   - grup `orders`: `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}/status` (nama `api.v1.orders.*`).
   - grup `owner`: `GET /orders`, `GET /dashboard`, `GET /profile`, `PUT /profile`, `PUT /password` (nama `api.v1.owner.*`).
6. **Data awal** — pastikan ada akun `admin` untuk pengujian manual (lihat §14).
7. **Test** — lihat §13.
8. **Frontend** — §11, dikerjakan terpisah setelah API stabil.

File backend yang akan disentuh:

| Aksi | File |
| :--- | :--- |
| Baru | 4 file migrasi (§5) |
| Baru | `app/Models/PesananStatusHistory.php` |
| Baru | `app/Http/Controllers/OwnerDashboardController.php` |
| Baru | `app/Http/Controllers/OwnerProfileController.php` |
| Ubah | `app/Http/Controllers/PesananController.php` |
| Ubah | `app/Models/Pesanan.php`, `app/Models/User.php`, `app/Models/daftar_layanan.php` |
| Ubah | `routes/api.php` |
| Baru | `tests/Feature/Api/OrderTest.php`, `OrderTrackingTest.php`, `OwnerDashboardTest.php`, `OwnerSettingsTest.php` |

Tidak ada perubahan pada `Authcontroller`, `LayananController`, `RiviewController`, `PembayaranController`, `AdminMiddleware`, `bootstrap/app.php`, atau konfigurasi auth.

---

## 13. Rencana Pengujian

Perintah:

```bash
cd backend
php artisan test --filter=Order
php artisan test --filter=Owner
php artisan test
php artisan route:list --path=api
```

Test memakai SQLite `:memory:` dari `phpunit.xml`, jadi seluruh migrasi (termasuk yang baru) ikut dijalankan setiap test.

### 13.1 Riwayat booking

- `POST /orders` membuat baris `pesanan` dengan `user_id` dari token, bukan dari body.
- Total dihitung server: `harga × jumlah`; mengirim `total_harga` dari klien diabaikan.
- `GET /orders` hanya mengembalikan pesanan milik user yang login (buat 2 user, pastikan terpisah).
- `GET /orders` tanpa token → `401`.
- Pesanan tetap ada setelah request baru (bukti persistensi di DB, bukan storage browser).

### 13.2 Tracking

- `GET /orders/{id}` mengembalikan `timeline` terurut naik.
- User lain membuka pesanan tersebut → `403`.
- ID tidak ada → `404`.
- `PATCH /orders/{id}/status` oleh `user` → `403`.
- `PATCH` oleh `admin` menambah baris history dan mengubah `status` pesanan.
- Transisi ilegal (`completed → processing`) → `422`.
- Pembatalan tanpa `catatan` → `422`.

### 13.3 Setting owner

- `GET /owner/profile` mengembalikan data sendiri dan tidak memuat `password`.
- `PUT /owner/profile` mengubah nama/email/nomor telepon dan persisten setelah request ulang.
- Email milik user lain → `422`.
- `PUT /owner/password` dengan password lama salah → `422`.
- Password baru tersimpan sebagai hash (`Hash::check` benar) dan token lama lain dicabut.
- `user` biasa mengakses endpoint owner → `403`.

### 13.4 Dashboard owner

- Metrik dihitung dari data DB, bukan nilai statis.
- `total_revenue` hanya menjumlahkan pesanan dengan pembayaran `paid`.
- `recent_orders` maksimal 5 dan urut terbaru.

---

## 14. Catatan Operasional & Risiko

1. **MySQL lokal tidak aktif saat analisis.** `php artisan db:show` gagal connect ke `127.0.0.1:3306` (database `Eatersive`). Migrasi belum dijalankan; test tetap bisa jalan lewat SQLite in-memory.
2. **Belum ada akun admin.** `DatabaseSeeder` hanya membuat `test@example.com` dengan role default `user`. Untuk uji manual, promosikan akun yang ada (bukan membuat data palsu produksi):
   ```bash
   php artisan tinker --execute="App\Models\User::where('email','test@example.com')->update(['role'=>'admin']);"
   ```
3. **Role backend `admin`, frontend `owner`.** Jangan mengganti nama role di backend; frontend sudah memetakan `admin → owner`.
4. **Dokumen lama sudah usang.** `README.md` dan `docs/FRONTEND_BACKEND_INTEGRATION.md` masih menyebut backend hanya punya `health`/`ping`. Dokumen ini yang berlaku untuk area pesanan/owner.
5. **`riviews` belum punya `rating`.** Halaman tracking memiliki form ulasan, tetapi penyimpanan ulasan bukan bagian dari 3 task ini. Jangan mengisi rating palsu; form harus menampilkan status "belum tersedia" sampai F-03 dikerjakan.
6. **Pembayaran belum terintegrasi gateway.** Status pembayaran hanya bisa berubah lewat proses F-02. `total_revenue` akan `0` dan itu **benar**, bukan bug.
7. **Multi-layanan.** Satu checkout dengan beberapa layanan menghasilkan beberapa baris `pesanan` dengan `kode_grup` sama. Riwayat harus mengelompokkan berdasarkan `kode_grup` agar tidak terlihat seperti duplikat.
8. **SQLite vs MySQL.** Test memakai SQLite; hindari raw SQL yang memakai fungsi khusus MySQL. Gunakan query builder/Eloquent.
9. **Jangan** menjalankan `migrate:fresh`, `db:wipe`, atau drop tabel pada database pengguna.

---

## 15. Definition of Done

Task dianggap selesai hanya jika seluruh poin berikut terpenuhi:

- [ ] Empat migrasi baru berjalan sukses di MySQL dan rollback-nya aman.
- [ ] Model diperbarui dan relasi `statusHistories` berfungsi.
- [ ] `POST /orders` menyimpan pesanan + pembayaran + history pertama dalam satu transaksi DB.
- [ ] `GET /orders` hanya mengembalikan data milik user yang login.
- [ ] `GET /orders/{id}` mengembalikan timeline nyata dan menolak akses lintas user.
- [ ] `PATCH /orders/{id}/status` hanya untuk admin, memvalidasi transisi, dan mencatat history.
- [ ] `GET /owner/orders` dan `GET /owner/dashboard` mengembalikan data DB nyata.
- [ ] `GET/PUT /owner/profile` dan `PUT /owner/password` berfungsi, aman, dan tidak membocorkan hash.
- [ ] Seluruh test pada §13 lulus, dan `php artisan test` tidak menurunkan hasil test yang sudah ada.
- [ ] Frontend memakai API (bukan `localStorage`) untuk riwayat, tracking, dan status pesanan.
- [ ] `localStorage`/`sessionStorage` tidak lagi menjadi sumber kebenaran data bisnis.
- [ ] Tidak ada route, tabel, model, atau komponen lama yang dihapus/di-rename.
