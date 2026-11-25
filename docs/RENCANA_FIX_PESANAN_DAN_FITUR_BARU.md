# Rencana Perbaikan Pesanan, Dashboard Owner, dan 8 Fitur Baru

**Produk:** EaterSive (layanan cuci sepatu)
**Branch analisis:** `feature/frontend` (commit `35340e2`)
**Tanggal analisis:** 25 November 2026
**Status dokumen:** Menunggu review — **belum ada kode aplikasi yang diubah**
**File yang dibuat:** dokumen ini saja

---

## 0. Ringkasan Eksekutif

Pesanan tidak masuk ke dashboard owner **bukan karena satu bug**, melainkan karena tiga rantai terputus sekaligus:

1. **Frontend tidak pernah mengirim pesanan ke backend.** Tombol *Booking Sekarang* hanya menyimpan ringkasan ke `sessionStorage`, lalu pindah halaman. Tidak ada request `POST /orders`.
2. **Backend tidak memiliki endpoint pesanan.** `routes/api.php` hanya berisi 16 route (auth, captcha, layanan, review, profil owner). `PesananController` dan `PembayaranController` masih stub kosong.
3. **Dashboard owner membaca data mock yang kosong.** `OwnerDashboardPage`, `OwnerOrdersPage`, dan `OwnerOrderDetailPage` membaca `data/ownerOrders.ts` yang isinya `[]`, bukan API.

Selain itu, fitur pesanan **pernah selesai** di commit `3efe131` (`fixing features pesanan saya, owner setting, backend`), lalu **tertimpa** oleh commit `53d4a77` (`adding captcha number`). Commit captcha menghapus 332 baris `PesananController`, menghapus route `orders`/`owner/orders`/`owner/dashboard`, dan mengembalikan halaman checkout/owner ke mode demo. Jadi strategi tercepat dan paling aman adalah **memulihkan implementasi dari `3efe131` secara selektif**, bukan menulis ulang dari nol.

Dokumen ini juga merinci desain untuk 8 fitur yang diminta, urutan eksekusi, file yang disentuh, kontrak API, migrasi, dan kriteria selesai.

---

## 1. Akar Masalah: Kenapa Pesanan Tidak Masuk Dashboard Owner

### 1.1 Rantai yang terputus

```text
[Customer klik Booking]
        │
        ▼
PembayaranPage.handleBooking()
        │  ❌ hanya saveConfirmationOrder() ke sessionStorage
        │  ❌ tidak memanggil createOrder()
        ▼
sessionStorage ──► /konfirmasi-pesanan (demo)
        │
        ▼
Tidak ada request HTTP ke backend
        │
        ▼
Tidak ada baris di tabel `pesanan`
        │
        ▼
OwnerOrdersPage membaca OWNER_ORDERS = []  ──► dashboard kosong
```

Bahkan jika frontend memanggil API, request akan gagal karena:

```text
POST /api/v1/orders
        │
        ▼
routes/api.php tidak punya grup `orders`
        │
        ▼
404 Not Found (bukan 500)
```

### 1.2 Bukti per file

| Lokasi | Kondisi saat ini | Dampak |
| :--- | :--- | :--- |
| `frontend/src/pages/user/PembayaranPage.tsx` → `handleBooking()` | Hanya `saveConfirmationOrder()` lalu `navigate('/konfirmasi-pesanan')` | Tidak ada order yang dikirim ke server |
| `frontend/src/api/orders.ts` | `createOrder`, `fetchMyOrders`, `fetchOwnerOrders`, `updateOrderStatus` sudah lengkap | Fungsi ada, tetapi **tidak dipakai** oleh halaman |
| `backend/routes/api.php` | 16 route; tidak ada `orders`, `owner/orders`, `owner/dashboard` | Semua endpoint pesanan 404 |
| `backend/app/Http/Controllers/PesananController.php` | Stub `make:controller`; semua method kosong | Tidak ada logika simpan/baca pesanan |
| `backend/app/Http/Controllers/PembayaranController.php` | Stub; semua method kosong | Tidak ada pengelolaan pembayaran |
| `backend/app/Models/Pesanan.php` | `$fillable` hanya field lama; tidak ada `statusHistories()` | Tidak bisa mass-assign `kode_pesanan`, `jumlah`, `total_harga`, dll. |
| `backend/app/Http/Controllers/OwnerDashboardController.php` | Logika lengkap, tetapi memanggil `PesananController::STATUS_LABELS` yang **tidak ada** | Fatal error bila route dipasang tanpa perbaikan |
| `frontend/src/pages/owner/OwnerOrdersPage.tsx` | Membaca `OWNER_ORDERS` dari `data/ownerOrders.ts` | Selalu kosong |
| `frontend/src/pages/owner/OwnerOrderDetailPage.tsx` | Membaca `OWNER_ORDER_BY_ID` (objek kosong) | Semua detail selalu "tidak ditemukan" |
| `frontend/src/pages/owner/OwnerDashboardPage.tsx` | Membaca `DASHBOARD_RECENT_ORDERS = []` | Semua metrik nol, grafik kosong |
| `frontend/src/data/ownerOrders.ts` | `OWNER_ORDERS = []`, `DASHBOARD_RECENT_ORDERS = []` | Tidak ada data untuk ditampilkan |
| `frontend/src/routes/AppRoutes.tsx` | Tidak ada route `/pesanan-saya`; `PesananSayaPage` tidak di-import | Riwayat pesanan tidak bisa diakses |

### 1.3 Bukti riwayat git (regresi)

| Commit | Isi | Dampak |
| :--- | :--- | :--- |
| `3efe131` `fixing features pesanan saya , owner setting , backend` | Menambahkan `PesananController` 351 baris, route `orders` + `owner/orders` + `owner/dashboard`, checkout memanggil `createOrder`, halaman owner membaca API | Fitur pesanan **pernah berfungsi** |
| `53d4a77` `adding captcha number` | Menghapus 332 baris `PesananController`, menghapus route pesanan/owner orders/dashboard, mengembalikan checkout, tracking, owner orders/detail ke demo | Fitur pesanan **hilang** |
| `35340e2` (HEAD) | Hanya memperbaiki deployment API, tidak memulihkan pesanan | Kondisi saat ini |

**Kesimpulan:** jangan menulis ulang. Pulihkan `PesananController`, `Pesanan` model, route, dan halaman frontend dari `3efe131`, lalu tambahkan fitur baru di atasnya. Perubahan CAPTCHA di commit `53d4a77` tetap dipertahankan.

---

## 2. Audit Fungsi Dashboard Owner

### 2.1 Ringkasan status

| Halaman | Fungsi | Status | Penyebab |
| :--- | :--- | :--- | :--- |
| `/owner` | Metrik pendapatan, pesanan baru, pelanggan aktif | ❌ Tidak berfungsi | Data dari `DASHBOARD_RECENT_ORDERS = []` |
| `/owner` | Grafik pendapatan/pesanan | ❌ Tidak berfungsi | Hanya metadata; tidak ada data/tidak memanggil API |
| `/owner` | Filter periode | ⚠️ Kosmetik | Hanya mengubah teks deskripsi |
| `/owner` | Tabel pesanan terbaru + pencarian/filter | ⚠️ Kosmetik | Bekerja, tetapi selalu kosong |
| `/owner` | Navigasi sidebar + logout | ✅ Berfungsi | — |
| `/owner` | Tombol profil di topbar | ❌ Tidak ada aksi | Belum ada handler |
| `/owner/orders` | Daftar pesanan | ❌ Tidak berfungsi | `OWNER_ORDERS = []` |
| `/owner/orders` | Pencarian, filter kategori, sorting, reset | ⚠️ Kosmetik | Logika benar, data kosong |
| `/owner/orders` | Klik baris → detail | ❌ Tidak berfungsi | Data kosong; detail tidak ditemukan |
| `/owner/orders/:id` | Detail pesanan | ❌ Tidak berfungsi | `OWNER_ORDER_BY_ID = {}` |
| `/owner/orders/:id` | Update status | ❌ Tidak berfungsi | Hanya `localStorage`; tidak ada API |
| `/owner/orders/:id` | Upload foto before/after | ❌ Tidak berfungsi | Hanya `FileReader` → state; hilang saat reload |
| `/owner/orders/:id` | Timeline pengerjaan | ❌ Palsu | Offset waktu statis, bukan riwayat server |
| `/owner/catalog` | Lihat katalog | ✅ Berfungsi | `GET /layanan` |
| `/owner/catalog` | Tambah/edit/hapus layanan (nama, deskripsi, harga) | ✅ Berfungsi | `POST/PUT/DELETE /layanan` |
| `/owner/catalog` | Simpan `kategori`, `estimasi`, `aktif` | ❌ Tidak berfungsi | Controller & `$fillable` mengabaikan field tersebut |
| `/owner/catalog` | Toggle aktif/nonaktif | ❌ Tidak berfungsi | `aktif` tidak divalidasi/di-fillable |
| `/owner/catalog` | Upload foto layanan | ❌ Selalu gagal | Base64 dikirim ke `foto` dengan validasi `max:255` |
| `/owner/reviews` | Daftar ulasan | ⚠️ Demo | `localStorage`, bukan API |
| `/owner/reviews` | Moderasi & balasan | ⚠️ Demo | Disimpan di `localStorage` perangkat |
| `/owner/settings` | Profil owner | ✅ Berfungsi | `GET/PUT /owner/profile` |
| `/owner/settings` | Ganti password | ✅ Berfungsi | `PUT /owner/password` |
| `/owner/settings` | Manajemen gambar website | ❌ Belum ada | Dokumen `WEBSITE_IMAGE_MANAGEMENT_IMPLEMENTATION.md` belum dieksekusi |

### 2.2 Kesimpulan audit

- **Benar-benar berfungsi:** login/logout, katalog (kecuali 3 field + foto), pengaturan owner.
- **Berfungsi tetapi data kosong/palsu:** dashboard, daftar pesanan, detail pesanan, ulasan.
- **Yang harus diperbaiki agar "dashboard owner berfungsi":**
  1. Pulihkan endpoint pesanan + sambungkan checkout.
  2. Sambungkan dashboard/daftar/detail ke API.
  3. Perbaiki katalog (`kategori`, `estimasi`, `aktif`, foto).
  4. Ulasan server-side: **di luar 8 fitur yang diminta**; akan dicatat sebagai batasan, bukan dikerjakan hari ini kecuali disetujui.

---

## 3. Ruang Lingkup 8 Fitur yang Diminta

| No | Fitur | Interpretasi yang diusulkan | Prioritas |
| :--- | :--- | :--- | :--- |
| 1 | **Member** | Status keanggotaan pelanggan + halaman owner untuk mengelola member & diskon member | P1 |
| 2 | **Fix pesanan tidak masuk dashboard owner** | Pulihkan seluruh alur order dari `3efe131` + sambungkan dashboard/daftar/detail ke API | **P0** |
| 3 | **Tombol lihat "Pesanan Saya"** | Link di header/landing + route `/pesanan-saya` + tombol ke konfirmasi/nota | P0 |
| 4 | **Diskon** | Diskon otomatis untuk member (persen per pelanggan), disimpan sebagai snapshot di pesanan | P1 |
| 5 | **Metode pembayaran cash** | Opsi "Cash / Bayar di Tempat" + owner menandai lunas | P1 |
| 6 | **Nota dilengkapi** | Halaman nota cetak (A4) berisi rincian item, diskon, pembayaran, status, foto barang | P2 |
| 7 | **Foto barang pelanggan** | Pelanggan upload maks. 3 foto sepatu saat checkout; owner melihatnya di detail | P2 |
| 8 | **Gambar bisa digeser** | Komponen carousel: hero landing, galeri dashboard owner, foto barang di detail | P2 |

**Catatan waktu:** 8 fitur dalam satu hari sangat ambisius. Urutan eksekusi di §9 disusun agar P0 selesai lebih dulu dan aplikasi tetap bisa dipakai meski fitur P2 belum sempurna.

---

## 4. Keputusan Desain yang Perlu Direview

Bagian ini adalah asumsi yang saya pakai. Jika ada yang berbeda, cukup koreksi saat review.

### 4.1 Member

**Usulan:** member adalah pelanggan (`role = user`) yang ditandai owner, bukan tabel/akun terpisah.

(member yg saya maksud adalah plpan member kayak semacam subscription untuk user)

- Tambah kolom di `users`: `is_member`, `diskon_persen`, `member_since`.
- Owner punya halaman `/owner/members` untuk mencari pelanggan, melihat total pesanan/belanja, mengaktifkan membership, dan mengatur diskon (0–100%).
- Pelanggan melihat badge "Member" di header/riwayat pesanan.
- Diskon member otomatis diterapkan saat checkout.

**Alternatif yang tidak dipilih (kecuali Anda minta):** tier/poin (bronze/silver/gold), member sebagai tabel terpisah, atau member sebagai akun login terpisah.

### 4.2 Diskon

**Usulan:** diskon member berbasis persen per pelanggan, dihitung server.
(paling gampang di set sama owner aja entah itu voucer dll)

- Default diskon member: **10%** (bisa diubah owner per pelanggan).
- Pesanan menyimpan snapshot `subtotal`, `diskon_persen`, `diskon`, `total_harga` agar riwayat tidak berubah saat diskon member diubah.
- Tidak membuat kode promo di iterasi ini.

**Alternatif:** kode promo (tabel `promo_codes`, input kode di checkout) — lebih besar, disarankan iterasi berikutnya.

### 4.3 Cash

**Usulan:** cash = bayar di tempat/COD.

- `metode_pembayaran` menerima `cash` di samping `qris`, `va`, `ewallet`.
- Status pembayaran awal `pending`; owner menandai `paid` + `tanggal_bayar` dari detail pesanan.
- Pendapatan dashboard hanya menghitung pembayaran `paid`.

### 4.4 Nota
(di page /konfirmasi-pesanan notanya kurang lengkap dan guruku bilang minta  bisa di add gambar sepatunya dari sisi depan kanan kiri atas)
**Usulan:** halaman nota A4 yang bisa dicetak (`window.print()`), bukan struk thermal.

- Route `/nota/:orderId` (login; pemilik pesanan atau admin).
- Isi: identitas toko, nomor nota/kode pesanan, tanggal, pelanggan, alamat, tabel item, subtotal, diskon, total, metode & status pembayaran, status pesanan, catatan, foto barang, footer.
- Link dari konfirmasi, pesanan saya, dan detail owner.
- CSS `@media print` menyembunyikan navigasi/tombol.

**Alternatif:** struk thermal 58/80 mm — bisa ditambahkan kemudian.

### 4.5 Foto barang pelanggan

**Usulan:** maksimal **3 foto opsional** per checkout, disimpan per `kode_grup` (satu kelompok checkout bisa berisi beberapa layanan).

- Format JPG/JPEG/PNG/WebP, maks. 4 MB per file.
- Disimpan di disk `public` (`storage/app/public/pesanan-fotos/{kode_grup}`).
- Perlu `php artisan storage:link`.
- Owner melihat galeri di detail pesanan; pelanggan melihatnya di konfirmasi/tracking/nota.

### 4.6 Carousel "gambar bisa digeser"
(di pagian page utama di hero gambar nya cuma 1 dan ubah biar bisa slide otomatis entah itu 1 - 5 gambar gpp)
**Usulan:** satu komponen `ImageCarousel` reusable, tanpa dependency baru.

- **Landing page:** hero image menjadi slider 3 gambar (gambar yang sudah ada + 2 gambar layanan).
- **Dashboard owner:** panel "Galeri Foto Barang Terbaru" berisi foto pesanan terbaru.
- **Detail pesanan owner:** galeri foto barang pelanggan (bisa digeser).
- Dukungan: tombol prev/next, dots, swipe (pointer/touch), keyboard arrow, autoplay opsional, pause saat hover.

### 4.7 Katalog owner
(bisa kamu buat semua itu berfungsi? tapi yg standar aja)
Karena Anda meminta "periksa apakah semua dashboard owner berfungsi", saya usulkan **ikut memperbaiki katalog** meski tidak masuk 8 daftar:

- Validasi + `$fillable` untuk `kategori`, `estimasi`, `aktif`.
- Ganti foto base64 dengan upload multipart ke `POST /layanan/{id}/foto` (memakai `ImageStorageService`).
- Toggle aktif/nonaktif benar-benar tersimpan.

### 4.8 Ulasan owner

Ulasan saat ini hanya `localStorage`. Tidak ada endpoint `GET /reviews`, dan `POST /reviews` belum menyimpan rating. **Tidak termasuk scope hari ini** kecuali Anda minta; akan dicatat sebagai batasan.

---

## 5. Desain Data dan Migrasi

Semua migrasi baru mengikuti gaya proyek: **aditif, idempoten, memakai guard `Schema::hasColumn` / `hasTable` / `hasIndex`**, tanpa `migrate:fresh`.

### 5.1 `users` — membership & diskon

```php
Schema::table('users', function (Blueprint $table) {
    if (! Schema::hasColumn('users', 'is_member')) {
        $table->boolean('is_member')->default(false)->after('role');
    }
    if (! Schema::hasColumn('users', 'diskon_persen')) {
        $table->unsignedTinyInteger('diskon_persen')->default(0)->after('is_member');
    }
    if (! Schema::hasColumn('users', 'member_since')) {
        $table->date('member_since')->nullable()->after('diskon_persen');
    }
});
```

### 5.2 `pesanan` — rincian harga & diskon

```php
Schema::table('pesanan', function (Blueprint $table) {
    if (! Schema::hasColumn('pesanan', 'subtotal')) {
        $table->decimal('subtotal', 12, 2)->nullable()->after('jumlah');
    }
    if (! Schema::hasColumn('pesanan', 'diskon_persen')) {
        $table->unsignedTinyInteger('diskon_persen')->default(0)->after('subtotal');
    }
    if (! Schema::hasColumn('pesanan', 'diskon')) {
        $table->decimal('diskon', 12, 2)->default(0)->after('diskon_persen');
    }
});
```

> `total_harga` sudah ada. Nilai akhir: `total_harga = subtotal - diskon`.

### 5.3 `pesanan_fotos` — foto barang pelanggan

```php
Schema::create('pesanan_fotos', function (Blueprint $table) {
    $table->id();
    $table->string('kode_grup', 24)->index(); // satu grup checkout
    $table->string('path');                   // path relatif disk public
    $table->unsignedTinyInteger('urutan')->default(0);
    $table->timestamps();
});
```

Alasan memakai `kode_grup`, bukan `pesanan_id`: satu checkout dapat berisi beberapa layanan, dan satu pesanan dibuat per layanan dengan `kode_grup` yang sama. Foto sepatu adalah milik kelompok pesanan, bukan salah satu layanan.

### 5.4 `pembayaran`

Tidak perlu kolom baru. `metode_pembayaran` sudah `string`; cukup tambah nilai `cash` di validasi. `status_pembayaran` memakai `pending|paid|failed|expired`, `tanggal_bayar` sudah ada.

### 5.5 Model yang berubah

| Model | Perubahan |
| :--- | :--- |
| `User` | `$fillable` + cast untuk `is_member`, `diskon_persen`, `member_since` |
| `Pesanan` | Pulihkan `$fillable`/cast/relasi dari `3efe131`; tambah `subtotal`, `diskon_persen`, `diskon`; relasi `fotos()` bila perlu |
| `PesananFoto` (baru) | `$fillable = ['kode_grup','path','urutan']`; accessor `url` |
| `Pembayaran` | Tidak berubah |
| `daftar_layanan` | Tambah `kategori`, `estimasi`, `aktif` ke `$fillable`; accessor `foto` (URL storage) |

---

## 6. Kontrak API

Format response tetap `{ success, message, data }`. Semua endpoint pesanan memakai `auth:sanctum`; endpoint owner memakai `auth:sanctum` + `admin`.

### 6.1 Pesanan

| Method | Endpoint | Akses | Keterangan |
| :--- | :--- | :--- | :--- |
| GET | `/api/v1/orders` | Customer | Pesanan milik user, terbaru dulu |
| POST | `/api/v1/orders` | Customer | Buat pesanan; total dihitung server |
| GET | `/api/v1/orders/{id}` | Pemilik/admin | Detail + timeline + foto |
| POST | `/api/v1/orders/photos` | Customer | Upload foto barang (multipart) berdasarkan `kode_grup` |
| DELETE | `/api/v1/orders/photos/{id}` | Pemilik/admin | Hapus foto (opsional) |
| PATCH | `/api/v1/orders/{id}/status` | Admin | Ubah status + catat history |
| PATCH | `/api/v1/orders/{id}/payment` | Admin | Tandai pembayaran `paid`/`pending` (terutama cash) |
| GET | `/api/v1/owner/orders` | Admin | Semua pesanan + filter `status`, `q` |
| GET | `/api/v1/owner/dashboard` | Admin | Metrik + pesanan terbaru + foto terbaru |
| GET | `/api/v1/owner/members` | Admin | Daftar pelanggan + agregat pesanan |
| PUT | `/api/v1/owner/members/{user}` | Admin | Set `is_member`, `diskon_persen` |

### 6.2 `POST /api/v1/orders`

Request:

```json
{
  "layanan_id": 1,
  "jumlah": 2,
  "nama": "Budi Santoso",
  "nomor_telp": "081234567890",
  "alamat": "Jl. Melati No. 5",
  "catatan": "Titip di pos",
  "metode_pembayaran": "cash",
  "kode_grup": "GRP-261125-AB12"
}
```

Perhitungan server:

```text
subtotal     = harga_layanan × jumlah
diskon_persen = user.is_member ? user.diskon_persen : 0
diskon        = round(subtotal × diskon_persen / 100)
total_harga   = subtotal - diskon
```

Response `201` menambahkan:

```json
{
  "subtotal": 100000,
  "diskon_persen": 10,
  "diskon": 10000,
  "total_harga": 90000
}
```

Validasi `metode_pembayaran`: `qris`, `va`, `ewallet`, `cash`.

### 6.3 `POST /api/v1/orders/photos`

`multipart/form-data`:

```text
kode_grup: GRP-261125-AB12
photos[]: file1.jpg
photos[]: file2.jpg
```

Aturan:

- Maksimal 3 foto per grup (total, termasuk yang sudah ada).
- `mimes:jpg,jpeg,png,webp`, `max:4096`.
- Hanya pemilik grup yang boleh upload.
- Response berisi daftar foto dengan `url` absolut.

### 6.4 `PATCH /api/v1/orders/{id}/payment`

```json
{
  "status_pembayaran": "paid",
  "catatan": "Dibayar tunai saat pengambilan"
}
```

- `paid` mengisi `tanggal_bayar = now()` bila belum ada.
- `pending` mengosongkan `tanggal_bayar`.
- Hanya admin.

### 6.5 `GET /api/v1/owner/members`

Response:

```json
{
  "id": 12,
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "nomor_telp": "081234567890",
  "is_member": true,
  "diskon_persen": 10,
  "member_since": "2026-11-25",
  "total_orders": 4,
  "total_spend": 320000,
  "last_order_at": "2026-11-25T10:30:00+07:00"
}
```

### 6.6 `GET /api/v1/owner/dashboard` (tambahan)

Response yang sudah ada ditambah:

```json
{
  "member_count": 5,
  "discount_total": 45000,
  "recent_photos": [
    { "id": 1, "url": "http://localhost:8000/storage/pesanan-fotos/...", "kode_pesanan": "ETS-..." }
  ]
}
```

---

## 7. Perubahan Frontend

### 7.1 Alur checkout baru

```text
/layanan
  pilih layanan → /pembayaran?items=...
        │
        ▼
/pembayaran
  isi alamat
  pilih metode (QRIS / VA / E-Wallet / Cash)
  lihat diskon member (jika member)
  upload foto barang (opsional, maks. 3)
  klik Booking
        │
        ├── POST /orders (satu per layanan, kode_grup sama)
        ├── POST /orders/photos (setelah order pertama)
        └── simpan ringkasan → /konfirmasi-pesanan?order={id}
        │
        ▼
/konfirmasi-pesanan?order={id}
  data dari API
  tombol: Lacak, Lihat Pesanan Saya, Cetak Nota
        │
        ├── /lacak-pesanan?order={id}
        ├── /pesanan-saya
        └── /nota/{id}
```

### 7.2 Perubahan per file

| File | Perubahan |
| :--- | :--- |
| `src/api/orders.ts` | Tambah tipe `subtotal/diskon/photos`, `uploadOrderPhotos`, `updatePaymentStatus` |
| `src/api/owner.ts` | Tambah `fetchOwnerMembers`, `updateOwnerMember`, field dashboard baru |
| `src/api/auth.ts` | `ApiUser` tambah `is_member`, `diskon_persen` |
| `src/types/auth.ts` | `AuthSession` tambah `isMember`, `discountPercent` |
| `src/auth/AuthProvider.tsx` | Simpan field member dari payload login/me |
| `src/auth/authStorage.ts` | Validasi field member (opsional/default) |
| `src/lib/checkout.ts` | `CheckoutOrder` tambah `orderIds`, `total`, `status`, `groupCode`; simpan foto |
| `src/pages/user/PembayaranPage.tsx` | Panggil `createOrder`, diskon, cash, upload foto, redirect dengan `order` |
| `src/pages/user/KonfirmasiPesananPage.tsx` | Baca `?order=`, fetch API, tombol nota/pesanan saya |
| `src/pages/user/PesananSayaPage.tsx` | Route + grouping `kode_grup`, tombol konfirmasi/nota/lacak |
| `src/pages/user/LacakPesananPage.tsx` | Pulihkan versi API dari `3efe131`; tampilkan foto |
| `src/pages/user/LandingPage.tsx` | Link "Pesanan Saya" + hero carousel |
| `src/components/user/UserHeader.tsx` | Link "Pesanan Saya" selalu tampil |
| `src/routes/AppRoutes.tsx` | `/pesanan-saya` + `/nota/:orderId` dalam `RequireAuth`; tetap pertahankan `/register` dan `/captcha-preview` |
| `src/pages/owner/OwnerDashboardPage.tsx` | Fetch `/owner/dashboard`, metrik nyata, galeri carousel |
| `src/pages/owner/OwnerOrdersPage.tsx` | Pulihkan versi API `3efe131`; kolom member/diskon/pembayaran |
| `src/pages/owner/OwnerOrderDetailPage.tsx` | Pulihkan versi API; foto barang, cash lunas, tombol nota |
| `src/pages/owner/OwnerCatalogPage.tsx` | Kirim field yang benar; upload foto multipart |
| `src/components/owner/OwnerShell.tsx` | Tambah nav "Member" |
| `src/pages/owner/OwnerMembersPage.tsx` (baru) | Daftar member, toggle, atur diskon |
| `src/pages/user/NotaPage.tsx` (baru) | Nota cetak A4 |
| `src/components/shared/ImageCarousel.tsx` (baru) | Carousel reusable |
| `src/styles/nota.css` (baru) | Layout nota + print |
| `src/styles/members.css` (baru) | Layout halaman member |
| `src/styles/image-carousel.css` (baru) | Carousel |

### 7.3 Route baru

```tsx
<Route element={<RequireAuth />}>
  <Route path="/pesanan-saya" element={<PesananSayaPage />} />
  <Route path="/lacak-pesanan" element={<LacakPesananPage />} />
  <Route path="/nota/:orderId" element={<NotaPage />} />
</Route>

<Route element={<RequireRole role="owner" />}>
  <Route path="/owner/members" element={<OwnerMembersPage />} />
</Route>
```

---

## 8. Rencana Pemulihan dari Git (Penting)

Jangan lakukan `git checkout 3efe131 -- <file>` secara membabi buta untuk file yang juga berubah di commit CAPTCHA. File berikut **mengandung perubahan CAPTCHA** dan harus di-merge manual, bukan ditimpa:

- `frontend/src/components/user/UserHeader.tsx`
- `frontend/src/auth/AuthProvider.tsx`
- `frontend/src/auth/session-store.ts`
- `frontend/src/routes/AppRoutes.tsx`
- `frontend/src/pages/user/LoginPage.tsx`
- `frontend/src/lib/checkout.ts`
- `frontend/src/pages/user/KonfirmasiPesananPage.tsx`
- `frontend/src/pages/user/LacakPesananPage.tsx`
- `frontend/src/pages/user/PembayaranPage.tsx`

File backend yang **aman dipulihkan utuh** dari `3efe131` (tidak ada perubahan CAPTCHA):

- `backend/app/Http/Controllers/PesananController.php`
- `backend/app/Models/Pesanan.php`

File route `backend/routes/api.php` harus **digabung manual**: pertahankan route CAPTCHA + throttle login dari HEAD, tambahkan kembali grup `orders` dan `owner` dari `3efe131`.

File frontend yang bisa dipulihkan hampir utuh (tetap review diff):

- `frontend/src/pages/owner/OwnerOrdersPage.tsx`
- `frontend/src/pages/owner/OwnerOrderDetailPage.tsx`
- `frontend/src/pages/user/PesananSayaPage.tsx`

---

## 9. Urutan Eksekusi (Target Hari Ini)

### Fase 0 — P0: Pulihkan alur pesanan (paling kritis)

1. Pulihkan `PesananController` dari `3efe131`.
2. Pulihkan `Pesanan` model (fillable, cast, relasi).
3. Tambahkan route `orders` + `owner/orders` + `owner/dashboard` + `owner/profile` ke `routes/api.php`.
4. Perbaiki `OwnerDashboardController` agar memakai `STATUS_LABELS` yang sudah dipulihkan.
5. Jalankan test: target `OrderTest` + `OwnerDashboardTest` lulus.
6. Pulihkan `PembayaranPage` agar memanggil `createOrder`.
7. Pulihkan `KonfirmasiPesananPage`/`LacakPesananPage`/`PesananSayaPage` ke versi API.
8. Daftarkan `/pesanan-saya` + link "Pesanan Saya" di header/landing.
9. Sambungkan `OwnerOrdersPage` + `OwnerOrderDetailPage` ke API.
10. Sambungkan `OwnerDashboardPage` ke `/owner/dashboard`.

**Output Fase 0:** booking customer benar-benar tersimpan, muncul di dashboard owner, bisa diubah statusnya.

### Fase 1 — P1: Member, diskon, cash

11. Migrasi `users` + `pesanan` (member/diskon).
12. Update model `User`, `Pesanan`.
13. Hitung diskon di `PesananController::store`; snapshot ke pesanan.
14. Tambah `cash` ke validasi metode pembayaran.
15. Endpoint `PATCH /orders/{id}/payment`.
16. Halaman `/owner/members` + API `GET/PUT /owner/members`.
17. Checkout: pilihan cash + baris diskon member + badge member.
18. Owner detail: tombol "Tandai Lunas" untuk cash.
19. Dashboard: hitung pendapatan hanya dari pembayaran `paid`, tambah jumlah member.

**Output Fase 1:** member bisa diatur owner, diskon otomatis, cash bisa ditandai lunas.

### Fase 2 — P2: Foto barang, nota, carousel

20. Migrasi `pesanan_fotos` + model.
21. `ImageStorageService` + `POST /orders/photos`.
22. Upload foto di checkout (preview, maks. 3).
23. Tampilkan foto di konfirmasi, tracking, owner detail.
24. Halaman `/nota/:orderId` + CSS print.
25. Link nota dari konfirmasi, pesanan saya, owner detail.
26. Komponen `ImageCarousel`.
27. Terapkan carousel di hero landing, galeri dashboard, dan foto barang detail owner.

### Fase 3 — Perbaikan katalog + verifikasi

28. Validasi + `$fillable` `kategori/estimasi/aktif`.
29. Upload foto layanan multipart (ganti base64).
30. Test backend baru, `pint`, `typecheck`, `lint`, `build`.
31. Uji manual end-to-end.

---

## 10. Rencana Pengujian

### 10.1 Backend

| Test | Cakupan |
| :--- | :--- |
| `OrderTest` (diperbarui) | Create order (subtotal, diskon, total server), auth, index milik sendiri, detail, timeline, transisi status, admin list |
| `PaymentTest` (baru) | Cash `pending → paid`, `tanggal_bayar`, non-admin 403 |
| `MemberTest` (baru) | Owner list/update member, diskon diterapkan saat order, customer 403 |
| `OrderPhotoTest` (baru) | Upload maks. 3, validasi mime/ukuran, hanya pemilik, URL publik |
| `OwnerDashboardTest` (diperbarui) | Metrik nyata, revenue hanya `paid`, recent orders, member count |
| `LayananTest` (diperbarui) | `kategori/estimasi/aktif` tersimpan, upload foto |

Target: **49 test lama lulus + test baru lulus**.

### 10.2 Frontend

```bash
npm run typecheck
npm run lint
npm run build
```

### 10.3 Uji manual end-to-end

1. Login customer (CAPTCHA).
2. Pilih 2 layanan, isi alamat, pilih **Cash**, upload 2 foto, booking.
3. Pastikan pesanan muncul di `/pesanan-saya`, `/konfirmasi-pesanan?order=...`, dan `/nota/{id}`.
4. Login owner: pesanan muncul di `/owner`, `/owner/orders`, detail menampilkan foto + diskon + cash.
5. Owner ubah status `pending → confirmed → processing`; customer melihat timeline berubah.
6. Owner tandai pembayaran cash `paid`; dashboard pendapatan bertambah.
7. Owner aktifkan member + diskon 10%; customer berikutnya melihat diskon di checkout.
8. Cetak nota; pastikan layout print rapi.
9. Geser carousel di landing dan dashboard (mouse + touch).

---

## 11. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| :--- | :--- | :--- |
| Pemulihan git menimpa perubahan CAPTCHA | Login rusak | Merge manual file yang beririsan (§8); jalankan `AuthTest` + `CaptchaTest` |
| Migrasi MySQL pada data lama | Gagal/duplikat kolom | Guard `hasColumn`/`hasTable`; tanpa `migrate:fresh` |
| Foto butuh symlink storage | URL 404 | Jalankan `php artisan storage:link`; dokumentasikan |
| Multi-layanan dalam satu checkout | Foto terduplikasi | Simpan foto per `kode_grup`, bukan per `pesanan_id` |
| `foto` layanan base64 lama | Data lama tetap ada | Accessor meneruskan URL eksternal/data URL apa adanya |
| Waktu 1 hari untuk 8 fitur | P2 belum selesai | Prioritaskan Fase 0 → 1 → 2; sisa dicatat |
| Ulasan owner masih lokal | Tidak sinkron antar perangkat | Dicatat sebagai batasan; di luar scope |
| Diskon member mengubah riwayat | Total lama berubah | Snapshot `diskon_persen` + `diskon` di pesanan |

---

## 12. Definition of Done

### Wajib (P0)

- [ ] Booking customer mengirim `POST /api/v1/orders` dan tersimpan di database.
- [ ] Pesanan muncul di `/owner`, `/owner/orders`, dan detail owner.
- [ ] Owner bisa mengubah status dan customer melihat timeline dari server.
- [ ] Tombol "Pesanan Saya" tampil di header/landing dan membuka `/pesanan-saya`.
- [ ] `php artisan test` lulus seluruhnya (termasuk `OrderTest` dan `OwnerDashboardTest`).

### Fitur baru (P1–P2)

- [ ] Member bisa diaktifkan owner dan diskon member diterapkan otomatis.
- [ ] Metode pembayaran cash tersedia dan bisa ditandai lunas.
- [ ] Nota lengkap bisa dicetak.
- [ ] Foto barang pelanggan bisa diunggah dan dilihat owner.
- [ ] Carousel berfungsi di landing, dashboard, dan detail pesanan.
- [ ] Katalog owner menyimpan kategori/estimasi/aktif dan foto dengan benar.

### Verifikasi

- [ ] `php artisan test`
- [ ] `./vendor/bin/pint --test`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Uji manual end-to-end (§10.3)

---

## 13. Pertanyaan untuk Anda

Mohon konfirmasi saat review agar eksekusi tidak salah arah:

1. **Member**: setuju dengan definisi "pelanggan ditandai owner + diskon persen"? Atau maksudnya tier/poin?
2. **Diskon**: cukup diskon member otomatis, atau perlu kode promo?
3. **Cash**: bayar di tempat dan owner menandai lunas — sudah sesuai?
4. **Nota**: format A4 print — atau butuh struk thermal?
5. **Foto barang**: maksimal 3 foto opsional per checkout — sudah sesuai?
6. **Carousel**: hero landing + galeri dashboard + foto barang di detail — sudah sesuai?
7. **Katalog**: ikut saya perbaiki (kategori/estimasi/aktif + foto) meski di luar 8 daftar?
8. **Ulasan**: tetap dibiarkan lokal untuk hari ini, atau ikut disambungkan ke server?

Jika semua asumsi di §4 disetujui, cukup balas **"lanjut"** dan saya eksekusi sesuai urutan §9.

jalankan perintah ini satu persatu (agar bisa aku commit manual dlu)dan buat md baru berisi penjelasan code nya perubahan atau membuat file baru di bagian mana aja (semua fitur jadiin 1 md aja)