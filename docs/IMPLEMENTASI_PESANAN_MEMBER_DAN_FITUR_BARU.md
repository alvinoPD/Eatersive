# Laporan Implementasi — Pesanan, Dashboard Owner, Member, dan 8 Fitur

**Produk:** EaterSive (layanan cuci sepatu)
**Branch:** `feature/frontend`
**Tanggal implementasi:** 25 November 2026
**Dokumen acuan:** `docs/RENCANA_FIX_PESANAN_DAN_FITUR_BARU.md` (sudah direview dan diedit owner)
**Status:** Implementasi selesai dan terverifikasi otomatis; satu pengecekan lint masih gagal karena masalah lama di file yang tidak diubah (dijelaskan di §13).

---

## 1. Ringkasan Eksekusi

Semua permintaan pada dokumen rencana sudah dikerjakan:

| No | Permintaan | Status | Bukti utama |
| :--- | :--- | :--- | :--- |
| 1 | **Member** (subscription/plan untuk user) | ✅ | Tabel `membership_plans` + `user_memberships`, halaman `/owner/members`, diskon otomatis |
| 2 | **Fix pesanan tidak masuk dashboard owner** | ✅ | Checkout memanggil `POST /orders`, owner membaca `GET /owner/orders` & `/owner/dashboard` |
| 3 | **Tombol lihat "Pesanan Saya"** | ✅ | Link di landing + header, route `/pesanan-saya` |
| 4 | **Diskon** | ✅ | Diskon member dihitung server, snapshot `subtotal/diskon_persen/diskon` |
| 5 | **Metode pembayaran cash** | ✅ | Opsi cash di checkout, owner menandai lunas via `PATCH /orders/{id}/payment` |
| 6 | **Nota dilengkapi** | ✅ | Halaman `/nota/:orderId` A4, foto 4 sisi, rincian harga, print CSS |
| 7 | **Foto barang pelanggan** | ✅ | Upload 4 sisi (depan/kanan/kiri/atas), tampil di konfirmasi, tracking, nota, owner |
| 8 | **Gambar bisa digeser** | ✅ | `ImageCarousel` di hero landing (autoplay), galeri dashboard, foto pesanan |
| + | **Katalog owner berfungsi standar** | ✅ | `kategori/estimasi/aktif` tersimpan, foto multipart, toggle aktif, filter publik |
| + | **Dashboard owner berfungsi** | ✅ | Metrik, grafik 3/6 bulan, pesanan terbaru, galeri, member count, diskon |

Perubahan sesuai catatan edit Anda:

- **Member = paket subscription**, bukan sekadar flag. Owner membuat paket (nama, harga, durasi, diskon), lalu mengaktifkan paket untuk pelanggan.
- **Diskon diatur owner** lewat paket, dengan opsi override persen per pelanggan.
- **Foto sepatu 4 sisi** (depan, kanan, kiri, atas) dan ditampilkan di nota/konfirmasi.
- **Hero landing auto-slide** dengan 3 gambar (mudah ditambah sampai 5).
- **Katalog owner** dibuat berfungsi dengan endpoint dan upload file yang benar.

---

## 2. Akar Masalah yang Diperbaiki

Sebelum perubahan, pesanan tidak pernah sampai ke owner karena tiga rantai terputus:

```text
[Customer klik Booking]
        │
        ▼
PembayaranPage.handleBooking()
        │  ❌ hanya saveConfirmationOrder() ke sessionStorage
        ▼
/konfirmasi-pesanan (demo)
        │
        ▼
Tidak ada request HTTP → tidak ada baris di tabel `pesanan`
        │
        ▼
OwnerOrdersPage membaca OWNER_ORDERS = [] → dashboard kosong
```

Ditambah dua masalah backend:

1. `routes/api.php` tidak punya route `orders`, `owner/orders`, atau `owner/dashboard`.
2. `PesananController` dan `PembayaranController` masih stub kosong; `Pesanan` model tidak bisa mass-assign field baru dan tidak punya relasi timeline.

**Solusi yang dipakai:** memulihkan implementasi pesanan dari commit `3efe131`, lalu menambah fitur baru di atasnya. Perubahan CAPTCHA dari commit `53d4a77` tetap dipertahankan (route captcha, throttle login, CAPTCHA service).

---

## 3. Alur Baru End-to-End

### 3.1 Checkout customer

```text
/ (landing)
  └─ pilih layanan → /layanan
        └─ pilih item → /pembayaran?items={"1":2}
              ├─ isi & simpan alamat (localStorage)
              ├─ upload foto 4 sisi (opsional)
              ├─ pilih QRIS atau Cash
              ├─ melihat subtotal, diskon member, total
              └─ klik Booking
                    ├─ POST /api/v1/orders           (satu request per layanan, kode_grup sama)
                    ├─ POST /api/v1/orders/photos    (satu request per sisi, bila ada foto)
                    └─ redirect /konfirmasi-pesanan?order={id}
```

### 3.2 Konfirmasi, tracking, nota

```text
/konfirmasi-pesanan?order=12
  ├─ GET /orders/12          → detail + timeline + foto
  ├─ GET /orders             → semua pesanan milik user (untuk menggabungkan kode_grup)
  ├─ tombol Lacak            → /lacak-pesanan?order=12
  ├─ tombol Pesanan Saya     → /pesanan-saya
  └─ tombol Cetak Nota       → /nota/12

/nota/12
  ├─ GET /orders/12 + GET /orders
  ├─ layout A4, foto 4 sisi, subtotal/diskon/total
  └─ window.print() dengan @media print
```

### 3.3 Owner

```text
/owner                    → GET /owner/dashboard
/owner/orders             → GET /owner/orders
/owner/orders/{id}        → GET /orders/{id}
                            PATCH /orders/{id}/status
                            PATCH /orders/{id}/payment
/owner/members            → GET /owner/members
                            PUT /owner/members/{user}
                            CRUD /owner/membership-plans
/owner/catalog            → GET /layanan?include_inactive=1
                            POST/PUT/DELETE /layanan
                            POST /layanan/{id}/foto
```

### 3.4 Perhitungan harga (selalu di server)

```text
subtotal      = harga_layanan × jumlah
diskon_persen = diskon efektif membership aktif (0 bila bukan member)
diskon        = round(subtotal × diskon_persen / 100)
total_harga   = subtotal − diskon
```

Nilai `subtotal`, `diskon_persen`, dan `diskon` **disimpan sebagai snapshot** di baris pesanan. Jika owner mengubah diskon paket di kemudian hari, total pesanan lama tidak berubah.

---

## 4. Skema Database

Semua migrasi bersifat aditif dan memakai guard (`hasTable` / `hasColumn`), tanpa `migrate:fresh`.

### 4.1 Tabel baru: `membership_plans`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `id` | bigint PK | |
| `nama` | string(80) | Contoh: Member Bulanan |
| `deskripsi` | text nullable | Benefit paket |
| `harga` | decimal(12,2) | Harga langganan |
| `durasi_hari` | unsigned smallint | Default 30 |
| `diskon_persen` | unsigned tinyint | Default 10 |
| `aktif` | boolean | Default true |
| `timestamps` | | |

### 4.2 Tabel baru: `user_memberships`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `id` | bigint PK | |
| `user_id` | FK users, cascade | Pelanggan |
| `membership_plan_id` | FK membership_plans, cascade | Paket |
| `starts_at` | date | Mulai |
| `expires_at` | date | Berakhir |
| `diskon_persen` | unsigned tinyint nullable | Override diskon; null = ikut paket |
| `catatan` | text nullable | Catatan owner |
| `timestamps` | | |

Index: `(user_id, expires_at)`.

**Aturan aktif:** membership dianggap aktif bila `expires_at >= hari ini`. Tidak ada kolom `status` terpisah agar tidak ada dua sumber kebenaran.

### 4.3 Perubahan tabel `pesanan`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `subtotal` | decimal(12,2) nullable | Harga sebelum diskon |
| `diskon_persen` | unsigned tinyint default 0 | Snapshot persen |
| `diskon` | decimal(12,2) default 0 | Nominal diskon |

Kolom lama yang dipulihkan/dipakai: `kode_pesanan` (unik), `kode_grup` (index), `jumlah`, `total_harga`, `catatan`, `estimasi_selesai`.

### 4.4 Tabel baru: `pesanan_fotos`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `id` | bigint PK | |
| `kode_grup` | string(24), index | Satu checkout bisa berisi beberapa layanan |
| `path` | string | Path relatif disk `public` |
| `sisi` | string(10) | `depan`, `kanan`, `kiri`, `atas` |
| `urutan` | unsigned tinyint | Urutan tampil |
| `timestamps` | | |

Unique: `(kode_grup, sisi)` → satu foto per sisi; upload ulang akan **mengganti** foto sisi tersebut.

**Alasan memakai `kode_grup`, bukan `pesanan_id`:** satu checkout multi-layanan membuat beberapa baris `pesanan` dengan `kode_grup` yang sama, sedangkan foto sepatu adalah milik kelompok pesanan.

### 4.5 Tabel lama yang tidak diubah strukturnya

- `pembayarans`: `metode_pembayaran` sudah string, nilai `cash` cukup ditambahkan di validasi. `tanggal_bayar` dipakai untuk pelunasan.
- `pesanan_status_histories`: sudah ada, dipakai untuk timeline nyata.
- `daftar_layanans`: kolom `kategori`, `estimasi`, `aktif` sudah ada dari migrasi sebelumnya; yang diperbaiki adalah validasi, `$fillable`, dan pemakaiannya.
- `users`: tidak ditambah kolom; status member dihitung dari relasi `user_memberships`.

---

## 5. Perubahan Backend

### 5.1 Model

| File | Perubahan |
| :--- | :--- |
| `app/Models/Pesanan.php` | `$fillable` lengkap (kode, grup, jumlah, subtotal, diskon, total, estimasi); cast integer/decimal/date; relasi `statusHistories()`, `fotos()` (via `kode_grup`), `review()` |
| `app/Models/User.php` | Relasi `memberships()`; `currentMembership()`; `membershipSummary()`; `isMember()` |
| `app/Models/MembershipPlan.php` **(baru)** | `$fillable`, cast, relasi `memberships()` |
| `app/Models/UserMembership.php` **(baru)** | `$fillable`, cast tanggal, relasi `user()` & `plan()`, `effectiveDiscount()` (override ?? diskon paket) |
| `app/Models/PesananFoto.php` **(baru)** | `$fillable`, accessor `url` yang mengubah path storage menjadi URL publik |
| `app/Models/daftar_layanan.php` | `$fillable` + cast `aktif`; accessor `foto` yang meneruskan URL eksternal/data URL dan mengubah path storage menjadi URL publik |
| `app/Models/Pembayaran.php` | Cast `jumlah` decimal dan `tanggal_bayar` datetime |

### 5.2 `PesananController` (ditulis ulang, 535 baris diff)

| Method | Perilaku |
| :--- | :--- |
| `index()` | Daftar pesanan milik user login, filter status, urut terbaru |
| `ownerIndex()` | Semua pesanan + filter status/pencarian kode/nama/telepon |
| `store()` | Validasi, cek layanan aktif, hitung subtotal/diskon/total dari server, buat pesanan + history + pembayaran dalam satu transaksi |
| `show()` | Detail + timeline + foto; hanya pemilik atau admin (403 untuk user lain) |
| `updateStatus()` | Transisi status terbatas (`pending → confirmed → processing → quality_check → completed`), catat history + `changed_by`; `cancelled` wajib catatan |
| `updatePayment()` | Khusus admin; set `paid/pending/failed/expired`; `paid` mengisi `tanggal_bayar`, status lain mengosongkannya |
| `uploadPhotos()` | Validasi `kode_grup` milik user/admin, sisi valid, file gambar ≤4 MB; hapus foto lama pada sisi yang sama; simpan ke `pesanan-fotos/{kode_grup}` |
| `deletePhoto()` | Hapus file + baris; hanya pemilik grup atau admin |
| `format()` | Bentuk response konsisten: `subtotal`, `diskon_persen`, `diskon`, `total_harga`, `photos`, `timeline` |
| `generateOrderCode()` | `ETS-YYMMDD-XXXX` unik |
| `generateGroupCode()` | `GRP-YYMMDD-XXXX` |
| `estimateDate()` | Membaca angka dari teks estimasi layanan (mis. “2–3 Hari” → +2 hari) |

**Transisi status** (tidak bisa mundur):

```text
pending      → confirmed | cancelled
confirmed    → processing | cancelled
processing   → quality_check | cancelled
quality_check→ completed | cancelled
completed    → (final)
cancelled    → (final)
```

### 5.3 `OwnerMemberController` (baru)

| Method | Perilaku |
| :--- | :--- |
| `index()` | 200 pelanggan terakhir + agregat `pesanan_count`, `total_spend`, `last_order_at`, membership aktif; filter `q`; mengembalikan `members`, `plans`, `stats` |
| `update()` | Aktifkan/perpanjang paket, override diskon/durasi; `aktif=false` menghapus membership; perpanjangan dihitung dari tanggal berakhir yang masih berlaku |
| `publicIndex()` | Paket aktif untuk landing page |
| `storePlan()` / `updatePlan()` / `destroyPlan()` | CRUD paket dengan validasi harga/durasi/diskon |

Catatan: menghapus paket akan menghapus membership yang memakainya (cascade). Konfirmasi dilakukan di UI.

### 5.4 `OwnerDashboardController`

Metrik yang sekarang dihitung dari database:

- `total_orders`, jumlah per status (`pending`, `confirmed`, `processing`, `quality_check`, `completed`, `cancelled`)
- `total_revenue` — **hanya pembayaran `paid`**
- `total_discount`, `member_count`, `active_customers`, `queue_count`
- `recent_orders` (5 terbaru) + metode/status pembayaran
- `recent_photos` (8 foto terbaru) + `kode_pesanan`
- `monthly` — 6 bulan terakhir: jumlah pesanan dan pendapatan lunas per bulan

### 5.5 `LayananController`

- `index()`: publik hanya melihat layanan `aktif`; owner bisa `?include_inactive=1`.
- `store()` / `update()`: menerima `kategori`, `estimasi`, `aktif`, serta `foto` berupa **file** (multipart) atau string URL.
- `uploadPhoto()`: endpoint khusus `POST /layanan/{id}/foto`.
- `destroy()`: menghapus file foto lama dari storage.

### 5.6 `Authcontroller`

Payload `register`, `login`, dan `me` sekarang konsisten berisi:

```json
{
  "id": 12,
  "name": "Budi",
  "email": "budi@example.com",
  "role": "user",
  "nomor_telp": "081234567890",
  "is_member": true,
  "diskon_persen": 10,
  "membership": {
    "plan": "Member Bulanan",
    "diskon_persen": 10,
    "starts_at": "2026-11-25",
    "expires_at": "2026-12-25"
  }
}
```

Ini yang membuat frontend bisa menampilkan badge member dan diskon tanpa request tambahan.

### 5.7 Service baru

`app/Services/ImageStorageService.php`

- `store(UploadedFile, folder)` → simpan ke disk `public`, kembalikan path relatif.
- `delete(path)` → hapus file lama, aman untuk URL eksternal/data URL.
- `url(path)` → URL publik.

---

## 6. Kontrak API

Semua response memakai bentuk:

```json
{ "success": true, "message": "...", "data": ... }
```

### 6.1 Daftar endpoint

| Method | Endpoint | Akses | Fungsi |
| :--- | :--- | :--- | :--- |
| GET | `/api/v1/layanan` | Publik | Katalog aktif; `?include_inactive=1` untuk owner |
| POST | `/api/v1/layanan` | Admin | Tambah layanan (JSON atau multipart + `foto`) |
| PUT | `/api/v1/layanan/{id}` | Admin | Ubah layanan |
| POST | `/api/v1/layanan/{id}/foto` | Admin | Ganti foto layanan |
| DELETE | `/api/v1/layanan/{id}` | Admin | Hapus layanan |
| GET | `/api/v1/membership-plans` | Publik | Paket member aktif |
| GET | `/api/v1/orders` | Customer | Pesanan milik sendiri |
| POST | `/api/v1/orders` | Customer | Buat pesanan (hitung harga server) |
| GET | `/api/v1/orders/{id}` | Pemilik/admin | Detail + timeline + foto |
| POST | `/api/v1/orders/photos` | Pemilik grup/admin | Upload foto per sisi |
| DELETE | `/api/v1/orders/photos/{id}` | Pemilik/admin | Hapus foto |
| PATCH | `/api/v1/orders/{id}/status` | Admin | Ubah status |
| PATCH | `/api/v1/orders/{id}/payment` | Admin | Tandai pembayaran |
| GET | `/api/v1/owner/orders` | Admin | Semua pesanan |
| GET | `/api/v1/owner/dashboard` | Admin | Metrik + grafik + foto |
| GET | `/api/v1/owner/members` | Admin | Pelanggan + membership + paket |
| PUT | `/api/v1/owner/members/{user}` | Admin | Aktifkan/nonaktifkan member |
| GET/POST | `/api/v1/owner/membership-plans` | Admin | Lihat/tambah paket |
| PUT/DELETE | `/api/v1/owner/membership-plans/{plan}` | Admin | Ubah/hapus paket |
| GET/PUT | `/api/v1/owner/profile` | Admin | Profil owner |
| PUT | `/api/v1/owner/password` | Admin | Ganti password |

### 6.2 Contoh `POST /orders`

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

Response `201` (ringkas):

```json
{
  "success": true,
  "message": "Pesanan berhasil dibuat",
  "data": {
    "id": 12,
    "kode_pesanan": "ETS-261125-0431",
    "kode_grup": "GRP-261125-AB12",
    "status": "pending",
    "status_label": "Menunggu",
    "jumlah": 2,
    "subtotal": 100000,
    "diskon_persen": 10,
    "diskon": 10000,
    "total_harga": 90000,
    "layanan": { "id": 1, "nama": "Deep Cleaning", "harga": 50000 },
    "pembayaran": {
      "metode_pembayaran": "cash",
      "status_pembayaran": "pending",
      "jumlah": 90000
    },
    "photos": [],
    "timeline": [
      {
        "status": "pending",
        "status_label": "Menunggu",
        "catatan": "Pesanan dibuat.",
        "changed_by": null,
        "created_at": "2026-11-25T10:30:00+07:00"
      }
    ]
  }
}
```

Catatan: `total_harga` dari client **diabaikan**; server selalu menghitung ulang.

### 6.3 Upload foto

`POST /orders/photos` — `multipart/form-data`:

```text
kode_grup: GRP-261125-AB12
sisi: depan
photo: <file>
```

Aturan:

- `sisi` ∈ `depan|kanan|kiri|atas`.
- Format `jpg/jpeg/png/webp`, maksimal 4 MB.
- Satu sisi hanya boleh punya satu foto; upload ulang menggantikan foto lama.
- Hanya pemilik `kode_grup` atau admin.
- Response berisi daftar foto terbaru dengan `url` absolut.

### 6.4 Tandai pembayaran

`PATCH /orders/{id}/payment`

```json
{ "status_pembayaran": "paid", "catatan": "Dibayar tunai saat pengambilan" }
```

- `paid` mengisi `tanggal_bayar` bila belum ada.
- `pending` mengosongkan `tanggal_bayar`.
- Hanya admin.

### 6.5 Member

`GET /owner/members?q=budi`

```json
{
  "members": [
    {
      "id": 12,
      "name": "Budi",
      "email": "budi@example.com",
      "nomor_telp": "081234567890",
      "is_member": true,
      "plan_id": 1,
      "plan_name": "Member Bulanan",
      "diskon_persen": 10,
      "member_since": "2026-11-25",
      "member_until": "2026-12-25",
      "total_orders": 4,
      "total_spend": 320000,
      "last_order_at": "2026-11-25T10:30:00+07:00"
    }
  ],
  "plans": [],
  "stats": { "total_customers": 8, "active_members": 3, "total_discount": 45000 }
}
```

`PUT /owner/members/{user}`

```json
{
  "plan_id": 1,
  "aktif": true,
  "diskon_persen": 12,
  "durasi_hari": 60
}
```

- `diskon_persen`/`durasi_hari` opsional; kosong berarti ikut paket.
- `aktif: false` atau `plan_id: null` menghapus membership pelanggan.
- Perpanjangan dihitung dari `expires_at` terakhir yang masih berlaku.

---

## 7. Perubahan Frontend

### 7.1 API client & tipe

| File | Perubahan |
| :--- | :--- |
| `src/api/orders.ts` | Tipe `Order` lengkap (subtotal/diskon/photos), `PhotoSide`, label sisi, `uploadOrderPhotos()`, `updatePaymentStatus()`, label metode/status, `fetchOwnerOrders(params)` |
| `src/api/owner.ts` | Tipe dashboard baru (member, diskon, monthly, foto), tipe member/paket, CRUD paket, `fetchOwnerMembers`, `updateOwnerMember` |
| `src/api/layanan.ts` | `createLayanan(input, file?)` multipart, `uploadLayananPhoto()`, `fetchLayanan(includeInactive)` |
| `src/api/auth.ts` | `ApiUser` + `membership`, `is_member`, `diskon_persen` |
| `src/types/auth.ts` | `AuthSession` + `isMember`, `discountPercent`, `membershipPlan`, `membershipExpiresAt` |
| `src/auth/AuthProvider.tsx` | Menyimpan data member dari payload login |
| `src/auth/authStorage.ts` | Menormalkan sesi lama (default non-member) |
| `src/types/eatersive.ts` | `CheckoutOrder` + `orderIds`, `total`, `status`, `groupCode` |
| `src/lib/checkout.ts` | Helper `createGroupCode()`, membaca field baru dari sessionStorage |

### 7.2 Halaman customer

#### `PembayaranPage.tsx`

- Wajib login (route dilindungi `RequireAuth`).
- Menampilkan subtotal, diskon member, total dari perhitungan yang sama dengan server.
- Pilihan pembayaran **QRIS** dan **Cash / Bayar di Tempat**.
- Upload 4 foto (depan/kanan/kiri/atas) dengan preview dan tombol hapus.
- Saat Booking:
  1. membuat satu pesanan per layanan dengan `kode_grup` sama,
  2. mengunggah foto,
  3. menyimpan ringkasan ke sessionStorage,
  4. redirect ke `/konfirmasi-pesanan?order={id}`.
- Jika upload foto gagal, pesanan tetap tersimpan dan muncul peringatan (tidak menggagalkan booking).
- Alamat tetap disimpan di localStorage seperti sebelumnya.

#### `KonfirmasiPesananPage.tsx`

- Membaca `?order=`.
- Mengambil detail + semua pesanan user, lalu menggabungkan yang `kode_grup`-nya sama.
- Menampilkan status, metode/status pembayaran, subtotal, diskon, total, estimasi, dan carousel foto.
- Tombol: **Lacak**, **Pesanan Saya**, **Cetak Nota**, **Bagikan**.
- Tidak lagi memakai kalimat “demo”.

#### `PesananSayaPage.tsx`

- Route `/pesanan-saya` didaftarkan.
- Menampilkan metode pembayaran dan diskon member.
- Tombol per pesanan: **Lacak**, **Lihat Konfirmasi**, **Cetak Nota**.

#### `LacakPesananPage.tsx`

- Membaca `?order=` atau pesanan terbaru.
- Timeline diambil dari `statusHistories` server (bukan simulasi waktu).
- Menampilkan status saat ini, catatan perubahan, `changed_by`, foto, rincian harga, dan link nota.
- Form ulasan tetap disimpan lokal (lihat §15).

#### `NotaPage.tsx` **(baru)**

- Route `/nota/:orderId`.
- Layout A4: identitas toko, nomor nota, tanggal, pelanggan, alamat, tabel item, subtotal, diskon, total, metode/status pembayaran, estimasi, kode grup, foto 4 sisi, catatan, footer.
- `@media print` menyembunyikan toolbar dan menghilangkan shadow.
- Bisa dibuka dari konfirmasi, pesanan saya, tracking, dan detail owner.

### 7.3 Halaman owner

#### `OwnerOrdersPage.tsx`

- Membaca `GET /owner/orders`.
- Ringkasan total/proses/selesai dari data nyata.
- Pencarian kode/nama/telepon/layanan, filter kategori & status, sorting.
- Kolom total, diskon, metode & status pembayaran, status pesanan.
- Baris bisa diklik menuju detail.

#### `OwnerOrderDetailPage.tsx`

- Membaca `GET /orders/{id}`.
- Informasi pelanggan + tombol WhatsApp.
- Info layanan, jumlah, estimasi, catatan.
- Carousel foto sepatu pelanggan.
- Ringkasan pembayaran: subtotal, diskon, metode, status, total.
- Tombol **Tandai Lunas (Cash)** untuk pembayaran cash yang masih pending.
- Update status mengikuti transisi yang diizinkan server; catatan wajib untuk pembatalan.
- Timeline nyata dari server.
- Link ke nota.

#### `OwnerDashboardPage.tsx`

- Membaca `GET /owner/dashboard`.
- Metrik: pendapatan lunas, pesanan baru, pelanggan aktif + jumlah member, total diskon.
- Grafik batang 3/6 bulan (pendapatan atau jumlah pesanan).
- Tabel 5 pesanan terbaru dengan pencarian/filter status.
- Galeri foto barang terbaru (carousel autoplay).
- Ringkasan layanan dan antrean pengerjaan.

#### `OwnerMembersPage.tsx` **(baru)**

- Memakai `OwnerShell` yang sama dengan dashboard, dengan style shell (`sidebar`, `workspace`, `topbar`, profil, scrim mobile) ditambahkan di `members.css` karena seluruh style owner di proyek ini di-scope per `#page-...`.
- Statistik pelanggan/member/diskon/paket.
- Tabel paket: tambah, edit, hapus.
- Tabel pelanggan: total pesanan, total belanja, membership, diskon, tombol **Atur**.
- Dialog member: pilih paket, durasi override, diskon override, aktif/nonaktif.
- Semua data dari API, bukan localStorage.

#### `OwnerCatalogPage.tsx`

- Mengambil katalog termasuk nonaktif (`include_inactive=1`).
- Menyimpan `kategori`, `estimasi`, `aktif`.
- Upload foto memakai multipart (bukan base64), format JPG/PNG/WebP ≤4 MB.
- Hapus foto mengirim `foto: null`.
- Toggle aktif/nonaktif tersimpan di server.

#### `OwnerShell.tsx`

- Menu **Member** ditambahkan.
- Tombol profil sekarang membuka `/owner/settings`.
- Footer tidak lagi menyebut “mode demo”.

### 7.4 Komponen & landing

#### `ImageCarousel.tsx` **(baru)**

- Tanpa dependency tambahan.
- Tombol prev/next, dots, swipe pointer, panah keyboard.
- Autoplay opsional, berhenti saat hover/focus.
- Dipakai di:
  - hero landing (3 gambar, autoplay 4 detik),
  - galeri dashboard owner,
  - foto pesanan di konfirmasi/tracking/detail owner.

#### `LandingPage.tsx`

- Hero memakai carousel (mudah ditambah sampai 5 gambar di `HERO_IMAGES`).
- Link **Pesanan Saya** untuk user login.
- Badge **Member** di nama user.
- Section **Paket Member** mengambil `/membership-plans` dan menampilkan harga/durasi/diskon + CTA WhatsApp.

#### `UserHeader.tsx`

- Link **Pesanan Saya** untuk customer.

#### `AppRoutes.tsx`

- Route customer dilindungi `RequireAuth`: `/pembayaran`, `/konfirmasi-pesanan`, `/lacak-pesanan`, `/pesanan-saya`, `/nota/:orderId`.
- Route `/owner/members`.
- Route `/login` duplikat dihapus.

---

## 8. Daftar File Baru

### Backend

| File | Fungsi |
| :--- | :--- |
| `backend/app/Http/Controllers/OwnerMemberController.php` | Member & paket subscription |
| `backend/app/Models/MembershipPlan.php` | Model paket |
| `backend/app/Models/UserMembership.php` | Model langganan |
| `backend/app/Models/PesananFoto.php` | Model foto pesanan |
| `backend/app/Services/ImageStorageService.php` | Simpan/hapus/URL gambar |
| `backend/database/migrations/2026_11_25_000001_create_membership_plans_table.php` | Tabel paket |
| `backend/database/migrations/2026_11_25_000002_create_user_memberships_table.php` | Tabel langganan |
| `backend/database/migrations/2026_11_25_000003_add_pricing_fields_to_pesanan_table.php` | Subtotal/diskon |
| `backend/database/migrations/2026_11_25_000004_create_pesanan_fotos_table.php` | Foto 4 sisi |
| `backend/tests/Feature/Api/MemberTest.php` | 5 test member/diskon |
| `backend/tests/Feature/Api/PaymentTest.php` | 2 test cash/lunas |
| `backend/tests/Feature/Api/OrderPhotoTest.php` | 3 test foto |

### Frontend

| File | Fungsi |
| :--- | :--- |
| `frontend/src/components/shared/ImageCarousel.tsx` | Carousel reusable |
| `frontend/src/pages/user/NotaPage.tsx` | Nota A4 |
| `frontend/src/pages/owner/OwnerMembersPage.tsx` | Kelola member & paket |
| `frontend/src/styles/image-carousel.css` | Gaya carousel |
| `frontend/src/styles/nota.css` | Gaya nota + print |
| `frontend/src/styles/members.css` | Gaya halaman member |

---

## 9. Daftar File yang Diubah

### Backend

- `app/Http/Controllers/Authcontroller.php`
- `app/Http/Controllers/LayananController.php`
- `app/Http/Controllers/OwnerDashboardController.php`
- `app/Http/Controllers/PesananController.php`
- `app/Models/Pembayaran.php`
- `app/Models/Pesanan.php`
- `app/Models/User.php`
- `app/Models/daftar_layanan.php`
- `routes/api.php`

### Frontend

- `src/api/auth.ts`
- `src/api/layanan.ts`
- `src/api/orders.ts`
- `src/api/owner.ts`
- `src/auth/AuthProvider.tsx`
- `src/auth/authStorage.ts`
- `src/components/owner/OwnerShell.tsx`
- `src/components/user/UserHeader.tsx`
- `src/lib/checkout.ts`
- `src/pages/owner/OwnerCatalogPage.tsx`
- `src/pages/owner/OwnerDashboardPage.tsx`
- `src/pages/owner/OwnerOrderDetailPage.tsx`
- `src/pages/owner/OwnerOrdersPage.tsx`
- `src/pages/user/KonfirmasiPesananPage.tsx`
- `src/pages/user/LacakPesananPage.tsx`
- `src/pages/user/LandingPage.tsx`
- `src/pages/user/PembayaranPage.tsx`
- `src/pages/user/PesananSayaPage.tsx`
- `src/routes/AppRoutes.tsx`
- `src/styles/konfirmasi-pesanan.css`
- `src/styles/landing.css`
- `src/styles/owner-dashboard.css`
- `src/styles/owner-order-detail.css`
- `src/styles/owner-orders.css`
- `src/styles/pembayaran.css`
- `src/types/auth.ts`
- `src/types/eatersive.ts`

---

## 10. Migrasi & Penyiapan yang Sudah Dijalankan

Perintah yang sudah dijalankan pada environment ini:

```bash
cd backend
php artisan migrate --force
php artisan storage:link
```

Hasil:

- 4 migrasi baru berstatus `DONE`.
- Symlink `backend/public/storage` berhasil dibuat menuju `backend/storage/app/public`.

Untuk mesin lain, jalankan hal yang sama. Tanpa `storage:link`, foto layanan/pesanan akan 404.

---

## 11. Cara Menjalankan Aplikasi

```bash
# Terminal 1 — backend
cd backend
php artisan serve

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Pastikan:

- `backend/.env` berisi koneksi database yang valid.
- `frontend/.env` berisi `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1` (sesuaikan port).
- CORS backend mengizinkan origin frontend.
- Untuk menguji owner, akun harus memiliki `role = admin`. Contoh mengubah akun yang sudah terdaftar:

```bash
cd backend
php artisan tinker --execute="App\\Models\\User::where('email','owner@example.com')->update(['role'=>'admin']);"
```

---

## 12. Skenario Uji Manual

1. **Register/Login customer** (CAPTCHA).
2. Buka `/layanan`, pilih 2 layanan, lanjut ke `/pembayaran`.
3. Isi & simpan alamat; pilih **Cash**; unggah 4 foto; klik **Booking Sekarang**.
4. Pastikan redirect ke `/konfirmasi-pesanan?order=...` dan nomor pesanan muncul.
5. Buka `/pesanan-saya`, pastikan pesanan muncul; coba **Lacak**, **Konfirmasi**, **Cetak Nota**.
6. Login owner, buka `/owner`:
   - metrik dan grafik terisi,
   - pesanan baru muncul di tabel.
7. Buka `/owner/orders`, cari pesanan tadi, buka detail:
   - foto 4 sisi tampil,
   - diskon tampil (jika member),
   - ubah status `pending → confirmed → processing`,
   - untuk cash, klik **Tandai Lunas**.
8. Cek dashboard: pendapatan bertambah setelah lunas; antrean berubah.
9. Buka `/owner/members`:
   - tambah paket (mis. 30 hari, diskon 10%),
   - klik **Atur** pada pelanggan, pilih paket, simpan.
10. Login customer lagi, buka checkout: diskon 10% otomatis muncul dan total berkurang.
11. Buka `/nota/{id}`, klik **Cetak Nota**, cek layout A4 dan foto.
12. Geser hero landing (swipe/panah/dots), galeri dashboard, dan foto pesanan.

---

## 13. Hasil Verifikasi

### 13.1 Backend

```text
php artisan test
Tests: 59 passed (169 assertions)
Duration: ~4.84s
```

Rincian:

- 49 test lama tetap lulus (48 test Feature + 1 test Unit): Auth, Captcha, Health, Layanan, Order, OwnerDashboard, OwnerSettings, Ping, Riview.
- 10 test baru lulus:
  - `MemberTest` — 5 test
  - `PaymentTest` — 2 test
  - `OrderPhotoTest` — 3 test
- Total: **49 + 10 = 59 passed (169 assertions)**.

### 13.2 Frontend

```text
npm run typecheck  → PASS (exit 0)
npm run build      → PASS (exit 0)
vite v8.3.5 — 145 modules transformed
dist/assets/index-*.js ≈ 484 kB (141.6 kB gzip)
```

### 13.3 Lint

```text
npm run lint → FAIL (1 error)
```

Error tunggal:

```text
frontend/src/components/shared/CaptchaField.tsx:52
react-hooks/set-state-in-effect — void load();
```

File tersebut **tidak diubah** dalam pekerjaan ini dan error sudah ada sebelumnya. Aturan baru React Hooks mendeteksi `setLoading(true)` sinkron di dalam `load()` yang dipanggil effect. Build dan typecheck tidak terpengaruh. Saya tidak mengubahnya agar scope tetap pada permintaan Anda; perbaikannya bisa dilakukan terpisah (mis. memindahkan `setLoading` ke callback async atau memakai `startTransition`).

Tidak ada error lint dari file baru/ yang diubah pada pekerjaan ini.

---

## 14. Keputusan Desain & Alasan

| Keputusan | Alasan |
| :--- | :--- |
| Membership disimpan di tabel relasi, bukan kolom `users.is_member` | Riwayat langganan, paket, dan masa aktif lebih jelas; user bisa diperpanjang tanpa kehilangan histori paket |
| Diskon dihitung server, bukan dari frontend | Mencegah manipulasi total; client hanya menampilkan estimasi |
| Snapshot `subtotal/diskon_persen/diskon` di pesanan | Perubahan paket di kemudian hari tidak mengubah nota lama |
| Foto disimpan per `kode_grup` | Satu checkout multi-layanan hanya punya satu set foto sepatu |
| Satu foto per sisi (unique `kode_grup+sisi`) | Mencegah duplikasi; upload ulang menggantikan foto lama |
| `cash` sebagai nilai `metode_pembayaran` | Tidak perlu kolom/tabel baru; status pembayaran sudah ada |
| Halaman nota A4, bukan struk thermal | Sesuai permintaan “nota dilengkapi”; print CSS sederhana dan bisa diubah ke thermal nanti |
| Carousel tanpa library | Menghindari dependency baru; kebutuhan swipe/autoplay/dots sudah tercukupi |
| Owner mengaktifkan membership | Paket subscription butuh konfirmasi pembayaran; alur pembelian mandiri belum diminta |

---

## 15. Batasan & Pekerjaan yang Belum Dikerjakan

Hal-hal berikut **tidak** termasuk implementasi ini:

1. **Ulasan owner masih lokal.** Halaman `/owner/reviews` dan form ulasan di tracking masih memakai `localStorage`. Backend hanya punya `POST /reviews` untuk menyimpan teks ulasan; belum ada `GET /reviews`, rating, moderasi, atau balasan owner. Ini sudah dinyatakan di luar scope pada dokumen rencana.
2. **Pembelian membership mandiri oleh customer belum ada.** Customer melihat paket di landing dan mengajukan lewat WhatsApp; owner yang mengaktifkan. Belum ada checkout paket atau pembayaran langganan.
3. **QRIS/VA/E-Wallet belum terintegrasi payment gateway.** Metode dicatat di database, status awal `pending`, dan belum ada callback/webhook. Hanya cash yang bisa ditandai lunas manual.
4. **Notifikasi email/WhatsApp belum ada.** Perubahan status tersimpan di server dan terlihat saat halaman dimuat, tanpa push real-time.
5. **Struk thermal 58/80 mm belum dibuat.** Nota saat ini A4.
6. **Manajemen gambar website** (`docs/WEBSITE_IMAGE_MANAGEMENT_IMPLEMENTATION.md`) masih berupa rencana, belum dieksekusi.
7. **Foto before/after dari owner** belum diunggah ke server; detail owner menampilkan foto barang dari pelanggan. Fitur upload foto pengerjaan owner bisa ditambahkan berikutnya.
8. **Lint CaptchaField** masih gagal karena aturan React Hooks (lihat §13.3).

---

## 16. Troubleshooting

| Gejala | Penyebab | Solusi |
| :--- | :--- | :--- |
| Booking 401 | Belum login / token kedaluwarsa | Login ulang; route checkout sekarang dilindungi |
| Foto 404 | `storage:link` belum dijalankan | `cd backend && php artisan storage:link` |
| Pesanan tidak muncul di owner | Frontend membuka API lama / cache | Pastikan `VITE_API_BASE_URL` benar dan backend terbaru berjalan |
| `500` saat buka dashboard | Migrasi belum dijalankan | `php artisan migrate` |
| Diskon tidak muncul | Pelanggan bukan member aktif atau paket diskon 0 | Cek `/owner/members`, pastikan `expires_at >= hari ini` |
| Upload foto ditolak | Format bukan JPG/PNG/WebP atau >4 MB | Kompres/ubah format file |
| Status tidak bisa diubah | Transisi tidak diizinkan (mis. completed → processing) | Ikuti alur status |
| CORS error | Origin frontend belum diizinkan | Sesuaikan `backend/config/cors.php` / env |
| `419`/CSRF | Memanggil route web, bukan API | Gunakan `apiClient` (Bearer token) |

---

## 17. Ringkasan Perubahan Git

```text
36 file diubah, 3.221 insertions(+), 1.250 deletions(-)
20 file baru (backend + frontend + tests + docs)
```

File baru utama:

```text
backend/app/Http/Controllers/OwnerMemberController.php
backend/app/Models/MembershipPlan.php
backend/app/Models/UserMembership.php
backend/app/Models/PesananFoto.php
backend/app/Services/ImageStorageService.php
backend/database/migrations/2026_11_25_000001..000004
backend/tests/Feature/Api/MemberTest.php
backend/tests/Feature/Api/PaymentTest.php
backend/tests/Feature/Api/OrderPhotoTest.php
frontend/src/components/shared/ImageCarousel.tsx
frontend/src/pages/user/NotaPage.tsx
frontend/src/pages/owner/OwnerMembersPage.tsx
frontend/src/styles/image-carousel.css
frontend/src/styles/nota.css
frontend/src/styles/members.css
```

---

## 18. Rekomendasi Lanjutan

1. Perbaiki lint `CaptchaField` agar `npm run lint` hijau.
2. Sambungkan ulasan ke server (rating + moderasi + balasan owner).
3. Tambahkan alur pembelian membership mandiri (checkout paket + pembayaran).
4. Integrasikan payment gateway QRIS dan webhook status pembayaran.
5. Tambahkan upload foto before/after dari owner ke detail pesanan.
6. Tambahkan notifikasi WhatsApp/email saat status berubah.
7. Tambahkan struk thermal jika toko membutuhkannya.

---

**Catatan:** Dokumen rencana awal tetap tersimpan di `docs/RENCANA_FIX_PESANAN_DAN_FITUR_BARU.md`. Dokumen ini adalah laporan implementasi dan verifikasi dari rencana tersebut.
