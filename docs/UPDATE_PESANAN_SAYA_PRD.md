# PRD Update — Akses Riwayat Pesanan & Perbaikan Migrasi

**Produk:** Eatersive (layanan jasa cuci sepatu)
**Tanggal:** 6 November 2026
**Status:** Selesai diimplementasikan & terverifikasi
**Dokumen terkait:** `docs/BACKEND_IMPLEMENTATION_PRD.md` (spesifikasi lengkap backend), `docs/PRD.md` (PRD produk)

---

## 1. Ringkasan

Update ini memperbaiki dua hal yang saling berkaitan:

1. **Riwayat booking bisa diakses dari navigasi mana pun.** Sebelumnya pesanan hanya terlihat di halaman konfirmasi setelah checkout; begitu pengguna kembali ke homepage, pesanan seolah hilang.
2. **Error 500 saat booking (`Unknown column 'kode_pesanan'`).** Penyebabnya migrasi baru belum dijalankan di MySQL. Seluruh migrasi kini **idempoten**, sehingga aman dijalankan pada database yang sebagian kolomnya sudah pernah ditambahkan manual.

Tidak ada perubahan struktur folder, nama route, nama tabel (`daftar_layanans`, `riviews`), maupun mekanisme autentikasi (Sanctum + role `admin`).

---

## 2. Latar Belakang & Masalah

### 2.1 Riwayat pesanan "stuck" di halaman konfirmasi

Alur yang ada berhenti di `/konfirmasi-pesanan?order={id}`. Halaman landing (`/`) memakai header sendiri yang tidak memuat menu riwayat, dan link "Pesanan Saya" di header user hanya muncul ketika sesi aktif. Akibatnya:

- Pengguna tidak punya jalan kembali ke pesanannya dari homepage.
- Data pesanan terasa hanya "menempel" di satu halaman, bukan tersimpan sebagai riwayat akun.
- Tombol lacak progress hanya bisa dijangkau dari halaman booking.

### 2.2 Error 500 `Unknown column 'kode_pesanan'`

Saat pengguna menekan booking, backend menjalankan pengecekan kode pesanan:

```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'kode_pesanan'
in 'where clause' ... select exists(select * from `pesanan` where `kode_pesanan` = ETS-261106-2397)
```

`migrate:status` menunjukkan empat migrasi baru masih **Pending**:

| Migrasi | Status awal |
| :--- | :--- |
| `2026_11_06_000001_add_catalog_attributes_to_daftar_layanans_table` | Pending |
| `2026_11_06_000002_add_booking_fields_to_pesanan_table` | Pending |
| `2026_11_06_000003_create_pesanan_status_histories_table` | Pending |
| `2026_11_06_000004_add_nomor_telp_to_users_table` | Pending |

Percobaan `php artisan migrate` pertama gagal dengan:

```
SQLSTATE[42S21]: Column already exists: 1060 Duplicate column name 'kategori'
```

Karena kolom `kategori`, `estimasi`, dan `aktif` pada `daftar_layanans` ternyata sudah pernah ditambahkan manual, sementara migrasinya belum tercatat di tabel `migrations`.

---

## 3. Tujuan

| No | Tujuan | Ukuran keberhasilan |
| :--- | :--- | :--- |
| T-1 | Riwayat booking dapat dibuka dari navigasi mana pun | Link **Pesanan Saya** tampil di navbar landing dan header user; halaman menampilkan data dari API |
| T-2 | Pesanan tersimpan di akun, bukan hanya di halaman | Setelah checkout, pesanan muncul di `/pesanan-saya` walau pengguna sudah berpindah halaman |
| T-3 | Tracking dapat diakses tanpa lewat halaman konfirmasi | Tombol **Lacak Pesanan** tersedia di setiap kartu riwayat |
| T-4 | Migrasi aman dijalankan berulang / pada skema parsial | `php artisan migrate` sukses tanpa `Duplicate column` |
| T-5 | Alur booking kembali normal di MySQL | `POST /api/v1/orders` mengembalikan `201` |

---

## 4. Ruang Lingkup

### Termasuk

- Link navigasi **Pesanan Saya** di landing page dan header user.
- Pengalihan ke login yang menyimpan tujuan checkout.
- Halaman riwayat `/pesanan-saya` (daftar pesanan milik pengguna yang login).
- Tombol lacak yang membawa `order id` ke `/lacak-pesanan`.
- Migrasi idempoten + eksekusi migrasi pada MySQL `Eatersive`.

### Tidak termasuk

- Integrasi payment gateway (F-02).
- Kolom `rating` pada `riviews` dan penyimpanan ulasan ke server.
- Penyambungan UI dashboard owner ke endpoint `/owner/dashboard`.
- Perubahan desain global atau refactor struktur folder.

---

## 5. Keputusan Desain

1. **Satu sumber kebenaran: backend.** Daftar pesanan, status, dan timeline dibaca dari API; `localStorage` tidak dipakai untuk data bisnis.
2. **Link navigasi selalu tampil.** Link "Pesanan Saya" tidak lagi bergantung pada kondisi sesi; jika belum login, `RequireAuth` mengarahkan ke `/login` lalu kembali ke halaman tujuan.
3. **Checkout menyimpan tujuan login.** Pesan "Anda perlu masuk" di halaman pembayaran membawa `state.from = pathname + search`, sehingga setelah login pengguna tidak kehilangan pilihan layanan.
4. **Tracking memakai `pesanan.id`.** URL `/lacak-pesanan?order={id}` divalidasi kepemilikannya oleh backend.
5. **Migrasi aditif & idempoten.** Hanya menambah kolom/tabel; setiap langkah dicek dengan `Schema::hasColumn`, `Schema::hasIndex`, dan `Schema::hasTable`. Tidak ada rename/drop tabel, tidak memakai `migrate:fresh`.

---

## 6. Perubahan Implementasi

### 6.1 Frontend

| File | Perubahan |
| :--- | :--- |
| `frontend/src/pages/user/LandingPage.tsx` | Menambahkan link **Pesanan Saya** pada navigasi utama landing page. |
| `frontend/src/components/user/UserHeader.tsx` | Link **Pesanan Saya** selalu tampil di `main-nav`, bukan hanya saat sesi aktif. |
| `frontend/src/pages/user/PembayaranPage.tsx` | Link "masuk" membawa `state.from`; `handleBooking` memanggil `createOrder` per layanan, menyimpan ringkasan konfirmasi, lalu navigasi ke `/konfirmasi-pesanan?order={id}`. |
| `frontend/src/pages/user/PesananSayaPage.tsx` | Mengambil `fetchMyOrders`, mengelompokkan kartu per `kode_grup`, menangani state loading/kosong/error, dan menyediakan tombol lacak. |
| `frontend/src/pages/user/LacakPesananPage.tsx` | Mengambil `fetchOrderDetail(orderId)`; timeline dirender dari `order.timeline`. |
| `frontend/src/routes/AppRoutes.tsx` | `/pesanan-saya` dan `/lacak-pesanan` berada di grup `RequireAuth`. |
| `frontend/src/api/orders.ts` | Tipe dan fungsi `fetchMyOrders`, `fetchOrderDetail`, `createOrder`. |

**Alur pengguna setelah update**

```
Landing / Header user
        │  klik "Pesanan Saya"
        ▼
  (belum login?) ──► /login (state.from) ──► kembali ke tujuan
        │
        ▼
  /pesanan-saya  ── daftar pesanan dari API
        │
        ▼
  /lacak-pesanan?order={id} ── status & timeline nyata
```

### 6.2 Backend — migrasi idempoten

| Migrasi | Isi | Guard |
| :--- | :--- | :--- |
| `..._000001_add_catalog_attributes_to_daftar_layanans_table` | `kategori`, `estimasi`, `aktif` | `Schema::hasColumn` per kolom |
| `..._000002_add_booking_fields_to_pesanan_table` | `kode_pesanan` (unique), `kode_grup`, `jumlah`, `total_harga`, `catatan`, `estimasi_selesai` + index | `hasColumn` per kolom, `hasIndex` per index |
| `..._000003_create_pesanan_status_histories_table` | Tabel riwayat status + FK `pesanan_id`, `changed_by` | `Schema::hasTable` |
| `..._000004_add_nomor_telp_to_users_table` | `users.nomor_telp` | `Schema::hasColumn` |

Contoh pola yang dipakai:

```php
if (! Schema::hasColumn('pesanan', 'kode_pesanan')) {
    $table->string('kode_pesanan', 24)->nullable()->after('id');
}

if (! Schema::hasIndex('pesanan', 'pesanan_kode_pesanan_unique')) {
    Schema::table('pesanan', fn (Blueprint $table) => $table->unique('kode_pesanan'));
}
```

`down()` juga memeriksa keberadaan index/kolom sebelum menghapus, sehingga rollback tidak gagal pada skema parsial.

**Index yang terbentuk di `pesanan`:** `pesanan_kode_pesanan_unique`, `pesanan_kode_grup_index`, `pesanan_status_index`, `pesanan_created_at_index`.

### 6.3 Skema akhir (terverifikasi di MySQL)

```
pesanan
  id, kode_pesanan, kode_grup, foto, nama, nomor_telp, alamat, catatan,
  status, jumlah, total_harga, estimasi_selesai,
  user_id, layanan_id, created_at, updated_at

users
  id, name, email, nomor_telp, email_verified_at, password,
  remember_token, role, created_at, updated_at
```

---

## 7. Kontrak Perilaku

| Aksi | Endpoint | Perilaku |
| :--- | :--- | :--- |
| Riwayat pesanan | `GET /api/v1/orders` | Hanya pesanan milik token yang login, terbaru lebih dulu |
| Detail & timeline | `GET /api/v1/orders/{id}` | `404` bila bukan milik pengguna |
| Booking | `POST /api/v1/orders` | `201`, total dihitung backend (`harga × jumlah`), kode pesanan unik dibuat server |
| Lacak | `/lacak-pesanan?order={id}` | Wajib login; memakai data API, bukan simulasi |

Pesan error yang sebelumnya muncul:

```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'kode_pesanan' ... (HTTP 500)
```

Setelah migrasi dijalankan, alur yang sama menghasilkan `201 Created`.

---

## 8. Verifikasi

### 8.1 Migrasi & skema

```
php artisan migrate --force
  2026_11_06_000001_add_catalog_attributes_to_daftar_layanans_table ... DONE
  2026_11_06_000002_add_booking_fields_to_pesanan_table ............. DONE
  2026_11_06_000003_create_pesanan_status_histories_table ........... DONE
  2026_11_06_000004_add_nomor_telp_to_users_table ................... DONE
```

Pemeriksaan skema: kolom `kode_pesanan`, `kode_grup`, `jumlah`, `total_harga`, `catatan`, `estimasi_selesai` ada; tabel `pesanan_status_histories` ada; `users.nomor_telp` ada; seluruh index terbentuk.

### 8.2 Uji HTTP langsung ke MySQL

| Uji | Hasil |
| :--- | :--- |
| `GET /api/v1/orders` | `200` |
| `POST /api/v1/orders` | `201`, pesanan `ETS-261106-4456` tersimpan lengkap |
| Pembersihan data uji | pesanan, pembayaran, dan history kembali `0` |

### 8.3 Test otomatis & kualitas kode

| Perintah | Hasil |
| :--- | :--- |
| `cd backend && php artisan test --filter=Api` | **39 passed (101 assertions)** |
| `./vendor/bin/pint --test <4 file migrasi>` | pass |
| `cd frontend && npm run lint` | pass |
| `cd frontend && npm run typecheck` | pass |
| `cd frontend && npm run build` | pass |

### 8.4 Cara memverifikasi manual

1. Pastikan MySQL aktif dan `cd backend && php artisan migrate` sudah dijalankan.
2. Jalankan backend (`php artisan serve`) dan frontend (`npm run dev`).
3. Login sebagai user, lakukan booking dari halaman layanan.
4. Setelah halaman konfirmasi muncul, buka `/` lalu klik **Pesanan Saya**.
5. Pesanan harus tampil; klik **Lacak Pesanan** untuk melihat status dan timeline.

---

## 9. Risiko & Catatan

| Risiko / catatan | Dampak | Mitigasi |
| :--- | :--- | :--- |
| Database yang sebagian sudah diubah manual | Migrasi gagal `Duplicate column` | Guard `hasColumn`/`hasIndex`/`hasTable` (sudah diterapkan) |
| Checkout tanpa login | Pesanan tidak tersimpan | Pesan + link login yang menyimpan `state.from` |
| Ulasan masih disimpan di `localStorage` | Ulasan tidak lintas perangkat | Di luar lingkup; perlu kolom `rating` dan endpoint review |
| Dashboard owner masih statis | Angka tidak real-time | Endpoint `/owner/dashboard` sudah tersedia, tinggal disambungkan |
| Pembayaran belum lewat gateway | Status pembayaran manual | Di luar lingkup update ini |

---

## 10. Definition of Done

- [x] Link **Pesanan Saya** tampil di navbar landing dan header user.
- [x] Riwayat pesanan diambil dari API dan dikelompokkan per kode grup.
- [x] Tombol lacak membuka tracking berbasis data backend.
- [x] Empat migrasi idempoten dan berhasil dijalankan di MySQL `Eatersive`.
- [x] `POST /api/v1/orders` berhasil (`201`) pada database nyata.
- [x] Test API, Pint, lint, typecheck, dan build lulus.

---

## 11. Langkah Selanjutnya (opsional)

1. Menyambungkan `OwnerDashboardPage` ke `GET /api/v1/owner/dashboard`.
2. Menambahkan kolom `rating` pada `riviews` dan endpoint ulasan berbasis pesanan.
3. Integrasi payment gateway untuk menggantikan status pembayaran manual.
