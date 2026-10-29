# Pembersihan Data Dummy — Frontend EaterSive

Dokumen ini mencatat semua data contoh (dummy) yang dihapus dari folder `frontend/`,
apa yang menggantikannya, dan apa yang sengaja **tidak** diubah.

Prinsip yang dipakai:

- Data karangan (pesanan, pelanggan, ulasan, katalog, statistik, testimoni) dihapus.
- Tampilan, styling, route, dan alur fitur **tidak** diubah. Setiap halaman yang
  kehilangan datanya sekarang menampilkan keadaan kosong (empty state) yang jujur.
- Tidak ada data palsu baru yang ditambahkan sebagai pengganti.

## 1. Data yang dihapus

### `src/data/services.ts`

- 6 layanan contoh (`Basic`, `Hard`, `Suede / Nubuck`, `Helm & Bag`, `Hat / Cap`,
  `Flat Shoes & Kid Shoes`) beserta harga, rating, jumlah ulasan, estimasi, dan
  URL gambar Unsplash.
- `SERVICES` sekarang `[]`. `SERVICE_BY_ID` dan `SERVICE_CATEGORIES` tetap ada
  karena dipakai halaman dan `lib/checkout.ts`.

### `src/data/ownerCatalog.ts`

- 5 layanan katalog awal owner (`srv-basic`, `srv-hard`, `srv-suede`, `srv-helm`,
  `srv-hat`) dengan harga, kategori, dan gambar contoh.
- `DEFAULT_OWNER_SERVICES` sekarang `[]`; katalog hanya berisi layanan yang
  benar-benar ditambahkan owner lewat form (localStorage).

### `src/data/ownerOrders.ts`

- 5 pesanan contoh (`ORD-6758892`, `ORD-9821039`, `ORD-3548992`, `ORD-2675492`,
  `ORD-5437895`) lengkap dengan nama pelanggan, nomor telepon, alamat, avatar,
  produk, ukuran, warna, kondisi, harga, dan catatan.
- 5 baris `DASHBOARD_RECENT_ORDERS` (`ORD-7214` … `ORD-7210`) dengan nama
  pelanggan dan nominal.
- `OWNER_ORDERS` dan `DASHBOARD_RECENT_ORDERS` sekarang `[]`.
  `DEFAULT_OWNER_ORDER_ID` sekarang string kosong karena tidak ada pesanan contoh.

### `src/data/ownerReviews.ts`

- 5 template ulasan fiktif (Budi Santoso, Siti Aminah, Rizky Ramadhan, Dewi
  Lestari, Andika Pratama) dan generator `createMockReviews()` yang menggandakan
  template menjadi 125 ulasan palsu.
- `MOCK_REVIEW_TOTAL` dihapus. `readOwnerReviews()` sekarang mengembalikan `[]`
  bila belum ada ulasan tersimpan, dan tetap memvalidasi data localStorage.

### `src/data/landingContent.ts`

- `LANDING_TESTIMONIALS`: 2 testimoni fiktif (Andi Wijaya, Siti Rahma) beserta
  foto avatar Unsplash. Array sekarang `[]`.
- `LANDING_STEPS` (4 langkah cara kerja) dan `LANDING_FAQS` (5 pertanyaan)
  **dipertahankan** karena keduanya copy produk, bukan data pelanggan.

### Statistik dan social proof yang ditulis langsung di halaman

| Lokasi | Data dummy yang dihapus | Pengganti |
| --- | --- | --- |
| `src/pages/owner/OwnerDashboardPage.tsx` | Total pendapatan `Rp 12.450.000`, pesanan baru `142`, pelanggan aktif `856`, badge tren `+12,5% / +8,2% / +5,1%`, kurva sparkline, kurva grafik analitik + label sumbu, ringkasan layanan `84 / 48 / 32 / 12 unit`, `Sedang padat • 12 antrean` | Semua angka dihitung dari `DASHBOARD_RECENT_ORDERS` (jadi `0` saat kosong), kurva diganti keadaan kosong, antrean dihitung dari pesanan berstatus proses |
| `src/pages/owner/OwnerOrdersPage.tsx` | Ringkasan `24` total / `18` proses / `4` selesai | Dihitung dari `OWNER_ORDERS` |
| `src/pages/owner/OwnerReviewsPage.tsx` | `Total Review 1.248`, `Rating 4.8/5`, `Review Positif 92%`, analisis sentimen `95% / 78% / 88%`, teks `ulasan demo` | Total, rata-rata rating, dan persentase positif dihitung dari daftar ulasan; panel sentimen menjadi keadaan kosong |
| `src/pages/user/LandingPage.tsx` | Klaim `1.000+ pelanggan`, tumpukan avatar pelanggan Unsplash, kartu `1000+ Pelanggan`, grid testimoni | Klaim dihapus, kartu diganti informasi layanan `Antar-Jemput`, grid testimoni menampilkan keadaan kosong |

## 2. Keadaan kosong yang ditampilkan

| Halaman | Perilaku saat data kosong |
| --- | --- |
| `/` Landing | Bagian testimoni menampilkan `Belum ada testimoni yang ditampilkan…` (style baru `.testimonial-empty` di `styles/landing.css`) |
| `/layanan` | `Belum ada layanan pada katalog…` — pesan berbeda tetap muncul saat pencarian tidak menemukan hasil |
| `/pembayaran` | Pesan `Pesanan belum tersedia` yang sudah ada; tombol booking nonaktif |
| `/konfirmasi-pesanan` | `Rincian Pesanan Tidak Ditemukan` yang sudah ada |
| `/lacak-pesanan` | `Data pesanan belum tersedia…` yang sudah ada |
| `/owner` | Metrik `Rp 0 / 0 / 0`, grafik kosong, tabel pesanan kosong, ringkasan layanan kosong, antrean `Belum ada antrean` |
| `/owner/orders` | `Belum ada pesanan. Pesanan pelanggan akan muncul di sini.` + ringkasan `0/0/0` |
| `/owner/orders/:orderId` | Halaman tidak lagi jatuh ke pesanan contoh: tampil kartu `Pesanan ini belum tersedia…` dengan tautan kembali ke daftar pesanan |
| `/owner/catalog` | `Belum ada layanan pada katalog. Tambahkan layanan pertama…` + `Menampilkan 0 dari 0 layanan` |
| `/owner/reviews` | `Belum ada ulasan…`, statistik `0` dan `—`, panel sentimen kosong |

## 3. Yang sengaja tidak diubah

- **Login demo** (`src/data/demoAccounts.ts`) tetap ada sesuai permintaan, karena
  belum ada endpoint autentikasi di backend. Akun `owner@eatersive.id` /
  `owner123` dan `user@eatersive.id` / `user123` masih dipakai untuk masuk.
- Layout, kelas CSS, route, dan interaksi (filter, pencarian, dialog, pagination,
  unggah foto, update status) tidak berubah.
- Konten produk di landing page: langkah cara kerja, FAQ, daftar kategori
  layanan, alamat, dan kontak.
- Halaman template lama (`/template`, `/about`, `/api-status`) dan `src/api/`.
- Longgokan localStorage pengguna yang sudah ada tidak dihapus otomatis; katalog
  dan ulasan yang pernah ditambahkan owner tetap tampil.

## 4. Dampak ke pengembangan berikutnya

- Halaman membaca `src/data/*` sebagai sumber sementara yang kosong. Saat backend
  menyediakan endpoint katalog, pesanan, dan ulasan, ganti pembacaan ini dengan
  service di `src/api/` — markup dan empty state sudah siap.
- `OWNER_ORDER_BY_ID` serta `DEFAULT_OWNER_ORDER_ID` masih diekspor agar tipe dan
  import tidak berubah, tetapi tidak lagi menunjuk ke pesanan contoh.
- Catatan: bagian "Mock Data dan Keterbatasan" pada `STRUCTURE.md` masih
  menjelaskan kondisi sebelum pembersihan ini.

## 5. Verifikasi

- `npm run lint` — lulus.
- `npm run typecheck` — lulus.
- `npm run build` — lulus.
- Pemeriksaan DOM dengan Chrome headless pada `/`, `/layanan`, `/owner`,
  `/owner/orders`, `/owner/catalog`, `/owner/reviews`, dan
  `/owner/orders/ORD-1`: semua halaman merender keadaan kosong di atas tanpa
  error dan tanpa angka contoh yang tersisa.
