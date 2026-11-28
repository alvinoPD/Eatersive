# Materi Presentasi EaterSive — Update Fitur

**Produk:** EaterSive — layanan cuci, perawatan, dan restorasi sepatu
**Stack:** Laravel API + React 19 + TypeScript + Vite
**Tanggal materi:** 28 November 2026

Dokumen ini adalah bahan pendamping sebelum presentasi. Fokusnya pada fitur
yang baru diperbarui, alur demo, penjelasan teknis singkat, dan antisipasi
pertanyaan.

---

## 1. Ringkasan 60 Detik

EaterSive sekarang bukan hanya alur booking, tetapi sudah punya siklus lengkap:

1. Pelanggan booking dan mengirim ulasan.
2. Owner memoderasi ulasan.
3. Ulasan yang dipublikasikan otomatis tampil sebagai testimoni di landing page.
4. Tampilan mobile punya menu navigasi yang lengkap.
5. Booking punya konfirmasi sebelum pesanan dibuat.
6. Halaman dipecah per route dan section dirender saat mendekati layar supaya lebih ringan.

Kalimat pembuka yang bisa dipakai:

> “Pada update ini kami merapikan pengalaman pengguna dari sisi tampilan,
> menyambungkan ulasan pelanggan ke dashboard owner sampai testimoni publik,
> dan mengurangi beban awal website dengan lazy loading.”

---

## 2. Perubahan yang Akan Didemokan

| Fitur | Sebelum | Sekarang |
| :--- | :--- | :--- |
| Logo | Ikon bawaan | Logo EaterSive dari file desain, dipasang di badge brand |
| Navigasi mobile | Menu hilang / link akun terpotong | Tombol hamburger + dropdown berisi Pesanan Saya, akun, dan Keluar |
| Booking | Langsung membuat pesanan | Muncul modal “Apakah Anda sudah yakin?” di dalam halaman |
| Animasi | Statis | Transisi halaman, nav, tombol, modal, FAQ, dan reveal section |
| Ulasan pelanggan | Hanya tersimpan di browser | Dikirim ke database lewat API |
| Moderasi owner | Data contoh / localStorage | Ulasan asli dari database, status dan balasan tersimpan di server |
| Publikasi ulasan | Tidak ada efek | Ulasan berstatus `Dipublikasikan` tampil di Testimoni Pelanggan |
| Performa | Semua halaman dimuat sekaligus | Kode dipecah per route + section dirender saat mendekati layar |

---

## 3. Alur Demo yang Disarankan (10 Menit)

| Waktu | Halaman | Yang Ditunjukkan |
| :--- | :--- | :--- |
| 0:00–0:45 | Landing `/` | Logo baru, animasi navbar, hero, smooth scroll |
| 0:45–1:30 | Landing bagian Pertanyaan | Klik menu Pertanyaan, tunjukkan smooth scroll dan animasi FAQ |
| 1:30–2:15 | `/login` → `/` | Login customer, tunjukkan menu mobile berisi Pesanan Saya |
| 2:15–3:30 | `/layanan` → `/pembayaran` | Pilih layanan, isi alamat, klik Booking Sekarang, tunjukkan modal konfirmasi |
| 3:30–4:30 | `/lacak-pesanan` | Tunjukkan form ulasan: rating + komentar, lalu kirim |
| 4:30–6:00 | `/owner/reviews` | Login owner, tunjukkan ulasan masuk, buka menu titik-tiga, klik Publikasikan |
| 6:00–7:00 | `/` bagian Ulasan | Refresh landing, tunjukkan ulasan tadi sudah menjadi testimoni |
| 7:00–8:00 | `/owner/orders/{id}` | Ubah status pesanan, tunjukkan timeline customer ikut berubah |
| 8:00–9:00 | Device mode / lebar kecil | Tunjukkan menu hamburger, dropdown akun, dan responsivitas |
| 9:00–10:00 | DevTools Network | Tunjukkan bundle terpecah per halaman dan gambar lazy-load |

**Tips demo**

- Siapkan satu akun customer dan satu akun owner (`role = admin`).
- Siapkan satu ulasan baru agar alur kirim → moderasi → testimoni terlihat utuh.
- Buka dua jendela: satu customer, satu owner.
- Setelah memublikasikan ulasan, refresh landing page agar testimoni terbaru muncul.
- Gunakan koneksi normal; animasi dan lazy loading lebih terasa saat cache kosong.

---

## 4. Penjelasan Teknis Singkat

### 4.1 Logo Baru

- File logo dari folder `docs` dipotong area transparannya dan disimpan sebagai
  `frontend/public/eatersive-logo.png`.
- Logo berwarna putih sehingga ditempatkan di dalam badge brand berlatar gelap.
- Komponen `Brand` dipakai ulang di landing, halaman checkout, login/register,
  dan dashboard owner.

**Poin bicara:** “Satu sumber logo, dipakai konsisten di seluruh halaman.”

### 4.2 Navigasi Mobile

- `UserHeader` sekarang punya tombol hamburger dan state buka/tutup.
- Menu mobile memuat navigasi utama sekaligus link akun:
  **Pesanan Saya**, nama akun/dashboard, dan Keluar.
- CSS menu mobile dipusatkan di `styles/user-header.css` agar tidak bentrok
  dengan aturan tiap halaman.

**Poin bicara:** “Sebelumnya menu hanya disembunyikan di layar kecil. Sekarang
semua menu penting tetap bisa diakses.”

### 4.3 Konfirmasi Booking

- Tombol **Booking Sekarang** tidak langsung membuat pesanan.
- Muncul modal di dalam halaman berisi total pembayaran dan tombol
  **Ya, Booking Sekarang** / **Batal**.
- Setelah dikonfirmasi, baru `createOrder` dipanggil ke API.
- Modal bisa ditutup dengan klik area gelap atau tombol `Esc`.

**Poin bicara:** “Mengurangi pesanan tidak sengaja tanpa mengganggu alur.”

### 4.4 Animasi

- `styles/animations.css` menjadi pusat animasi global:
  - header dan konten masuk saat pindah halaman,
  - item navbar muncul berurutan,
  - logo bereaksi saat hover,
  - tombol terangkat saat hover,
  - modal muncul dengan efek pop,
  - section landing muncul saat masuk viewport (IntersectionObserver).
- FAQ punya animasi buka/tutup, ikon plus berputar, dan hover kartu.
- Semua animasi menghormati `prefers-reduced-motion`.

**Poin bicara:** “Animasi dibuat singkat dan fungsional, bukan sekadar hiasan.”

### 4.5 Ulasan sampai Testimoni

Alur data:

```text
Customer (Lacak Pesanan)
   │ POST /api/v1/reviews  (rating + komentar + layanan)
   ▼
Tabel riviews (status awal: Menunggu)
   │
   ├─ Owner: GET /api/v1/owner/reviews
   ├─ Owner: PATCH /api/v1/owner/reviews/{id}  (status / balasan)
   ▼
Status Dipublikasikan
   │ GET /api/v1/reviews  (publik)
   ▼
Landing page → Testimoni Pelanggan
```

- Rating disimpan di kolom `rating`.
- Status moderasi: `Menunggu`, `Dipublikasikan`, `Dilaporkan`, `Disembunyikan`.
- Balasan owner disimpan di `owner_reply`.
- Endpoint publik hanya mengembalikan ulasan `Dipublikasikan`, maksimal 6 terbaru.
- Landing menampilkan nama pelanggan, layanan, komentar, avatar inisial, dan bintang sesuai rating.

**Poin bicara:** “Ulasan bukan lagi data lokal. Sekali owner memublikasikan,
ulasan langsung menjadi bukti sosial di landing page.”

### 4.6 Performa: Load yang Terlihat Saja

Tiga lapis optimasi:

1. **Route-level code splitting**
   - Setiap halaman di-`React.lazy` dan dibungkus `Suspense`.
   - Bundle awal turun dari sekitar **487 kB** menjadi **322 kB**
     (gzip: sekitar **142 kB → 105 kB**).
   - Halaman owner dan customer dimuat hanya saat route-nya dibuka.

2. **Render section saat mendekati layar**
   - Section landing memakai `content-visibility: auto` dan
     `contain-intrinsic-size`.
   - Browser melewati render section yang jauh dari viewport.

3. **Gambar lazy-load**
   - Gambar layanan, promo, dan avatar testimoni memakai `loading="lazy"`
     dan `decoding="async"`.
   - Carousel sudah memuat gambar pertama secara eager dan sisanya lazy.

**Poin bicara:** “Yang berat bukan hanya JavaScript, tetapi juga render dan
gambar. Karena itu ketiganya kami tangani.”

---

## 5. Bukti Verifikasi

| Pemeriksaan | Hasil |
| :--- | :--- |
| `php artisan test --filter=RiviewTest` | 5 test lulus (20 assertion) |
| `npm run typecheck` | Lulus |
| `npm run build` | Lulus, output terpecah per halaman |
| Uji API ulasan | Kirim ulasan → muncul di owner → publikasi → muncul di endpoint publik |

Catatan: tampilan belum diuji visual menyeluruh di semua ukuran layar, jadi
saat gladi bersih tetap cek halaman mobile dan menu titik-tiga pada baris
terbawah tabel.

---

## 6. Antisipasi Pertanyaan

### “Apakah ulasan langsung muncul di landing setelah dipublikasikan?”

Ulasan muncul di endpoint publik saat statusnya `Dipublikasikan`. Landing
mengambil data saat halaman dibuka, jadi perlu refresh bila landing sudah
terbuka di tab lain.

### “Apakah pelanggan bisa mengubah status ulasannya sendiri?”

Tidak. Pelanggan hanya mengirim ulasan. Perubahan status moderasi dan balasan
hanya bisa dilakukan admin/owner.

### “Kenapa ulasan baru berstatus Menunggu?”

Supaya owner bisa memeriksa dulu sebelum tampil sebagai testimoni publik.
Ini juga mencegah komentar yang tidak pantas langsung tayang.

### “Apakah animasi memperlambat website?”

Animasi memakai CSS transform/opacity yang ringan. Semua animasi juga
dinonaktifkan otomatis bila pengguna memilih mengurangi gerakan
(`prefers-reduced-motion`).

### “Bagaimana cara website menjadi lebih ringan?”

Tiga hal utama: kode halaman dipecah per route, section di luar layar tidak
dirender, dan gambar di bawah lipatan dimuat saat dibutuhkan.

### “Apakah semua browser mendukung animasi buka-tutup FAQ?”

Animasi tinggi memakai `::details-content` yang didukung browser modern
(Chrome/Edge terbaru). Di browser lama, FAQ tetap berfungsi normal tanpa
animasi tinggi.

### “Apakah data ulasan lama tetap aman?”

Migrasi bersifat aditif: menambah kolom `rating`, `status`, `owner_reply`, dan
`kode_pesanan` dengan nilai default. Tidak ada penghapusan data.

---

## 7. Checklist Sebelum Presentasi

- [ ] Backend berjalan dan database sudah dimigrasi.
- [ ] `npm run build` dijalankan ulang setelah perubahan terakhir.
- [ ] Akun owner (`role = admin`) dan akun customer siap.
- [ ] Minimal satu ulasan berstatus `Menunggu` untuk didemokan.
- [ ] Landing page di-refresh setelah publikasi ulasan.
- [ ] Cek tampilan mobile: hamburger, Pesanan Saya, dan menu titik-tiga.
- [ ] Siapkan tab DevTools → Network untuk menunjukkan chunk halaman.
- [ ] Tutup tab/aplikasi berat lain agar demo berjalan lancar.

---

## 8. Batasan dan Rencana Berikutnya

**Batasan saat ini**

- QRIS masih berupa pencatatan metode, belum terhubung payment gateway.
- Testimoni di landing baru diperbarui saat halaman dimuat ulang.
- Analisis sentimen otomatis belum tersedia.
- Moderasi ulasan belum punya notifikasi ke pelanggan.
- Animasi tinggi FAQ bergantung pada dukungan browser modern.

**Rencana berikutnya**

- Integrasi payment gateway.
- Notifikasi WhatsApp/email saat ulasan dibalas atau dipublikasikan.
- Filter dan pencarian testimoni di landing.
- Optimasi gambar ke format WebP/AVIF.
- Audit aksesibilitas dan uji lintas browser.

---

## Penutup

Pesan kunci presentasi:

> “Update ini menyambungkan ulasan pelanggan ke dashboard owner sampai menjadi
> testimoni publik, merapikan navigasi mobile dan konfirmasi booking, serta
> membuat halaman lebih ringan dengan lazy loading. Semuanya dibangun di atas
> alur yang sudah ada tanpa membongkar data lama.”
