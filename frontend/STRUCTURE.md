# Struktur Frontend EaterSive

Dokumen ini menjelaskan hasil konversi 11 desain di `frontend examples/` menjadi aplikasi React di `frontend/`, termasuk struktur folder, route, alur data, dan login demo.

## 1. Ringkasan

- Framework: React 19 + TypeScript + Vite.
- Routing: React Router DOM 7.
- Styling: CSS asli dari setiap contoh, di-scope ke `#page-*` agar tidak saling bertabrakan.
- Data: mock data terpisah di `src/data/`; belum ada endpoint backend untuk pesanan, katalog, atau ulasan.
- Autentikasi: login demo owner/pelanggan berbasis `localStorage`/`sessionStorage`, bukan autentikasi produksi.
- Halaman template lama tetap tersedia di `/template`, `/about`, dan `/api-status`.

## 2. Cara Menjalankan

```bash
cd frontend
cp .env.example .env   # jika belum ada
npm install
npm run dev            # http://localhost:5173
```

`VITE_API_BASE_URL` tetap dipakai oleh halaman template `/api-status`. Halaman EaterSive sendiri belum memanggil API selain health check.

Perintah pemeriksaan:

```bash
npm run lint
npm run typecheck
npm run build
```

## 3. Login Demo (Owner / Pelanggan)

| Role | Nama | Email | Password | Redirect setelah login |
| --- | --- | --- | --- | --- |
| Owner | Admin EaterSive | `owner@eatersive.id` | `owner123` | `/owner` |
| Pelanggan | Budi Santoso | `user@eatersive.id` | `user123` | `/layanan` |

Di halaman `/login`, kedua akun ditampilkan dalam kotak **Akun demo**. Tombol **Isi** mengisi email dan password secara otomatis, lalu form dapat dikirim.

### Perilaku sesi

- **Ingat saya** dicentang: sesi disimpan di `localStorage` (bertahan setelah browser ditutup).
- **Ingat saya** tidak dicentang: sesi disimpan di `sessionStorage` (hanya untuk tab tersebut).
- Sesi disimpan dengan key `eatersive-auth-session`, tanpa password.
- Logout tersedia di sidebar owner dan header halaman user; logout menghapus kedua storage lalu kembali ke `/login`.
- Owner yang membuka `/login` dan berhasil masuk akan diarahkan ke `/owner` (atau halaman owner yang sebelumnya dituju).
- Pelanggan diarahkan ke `/layanan`, atau kembali ke halaman user yang sebelumnya dituju.

### Proteksi route

Semua route di bawah `/owner` dibungkus `RequireRole role="owner"`:

- Belum login → redirect ke `/login` dan menyimpan halaman tujuan (`location.state.from`).
- Login sebagai pelanggan lalu membuka `/owner` → redirect ke `/layanan`.
- Halaman user tetap dapat dibuka tanpa login agar alur pemesanan tidak berubah.

### Catatan keamanan

Login ini **hanya untuk demo frontend**:

- Email dan password ada di bundle JavaScript (`src/data/demoAccounts.ts`).
- Tidak ada request login ke Laravel, tidak ada token, dan tidak ada session server.
- Jangan gunakan pola ini untuk produksi. Ganti dengan Sanctum/token dari backend saat endpoint autentikasi tersedia.

## 4. Peta Route

| Path | Komponen | Akses | Keterangan |
| --- | --- | --- | --- |
| `/` | `LandingPage` | Publik | Landing page EaterSive |
| `/login` | `LoginPage` | Publik | Login demo owner/pelanggan |
| `/layanan` | `PilihLayananPage` | Publik | Katalog layanan dan ringkasan pesanan |
| `/pembayaran` | `PembayaranPage` | Publik | Alamat, ringkasan, metode pembayaran |
| `/konfirmasi-pesanan` | `KonfirmasiPesananPage` | Publik | Rincian pesanan demo |
| `/lacak-pesanan` | `LacakPesananPage` | Publik | Timeline simulasi dan form ulasan |
| `/owner` | `OwnerDashboardPage` | Owner | Dashboard metrik dan pesanan terbaru |
| `/owner/orders` | `OwnerOrdersPage` | Owner | Tabel dan filter pesanan |
| `/owner/orders/:orderId` | `OwnerOrderDetailPage` | Owner | Detail pesanan dan update status |
| `/owner/catalog` | `OwnerCatalogPage` | Owner | CRUD katalog lokal |
| `/owner/reviews` | `OwnerReviewsPage` | Owner | Moderasi ulasan dan balasan |
| `/template` | `HomePage` | Publik | Halaman template lama dipertahankan |
| `/about` | `AboutPage` | Publik | Halaman template lama |
| `/api-status` | `ApiStatusPage` | Publik | Uji koneksi ke backend Laravel |
| `*` | `NotFoundPage` | Publik | 404 di dalam layout template |

Semua navigasi internal memakai `Link`/`NavLink` sehingga tidak ada full-page reload. `ScrollToTop` mereset posisi scroll saat path berubah.

## 5. Struktur Direktori

```text
frontend/
├── index.html                  # font DM Sans + Manrope, root React
├── STRUCTURE.md                # dokumen ini
├── src/
│   ├── App.tsx                 # BrowserRouter + AuthProvider + ScrollToTop
│   ├── main.tsx                # entry point React
│   ├── index.css               # style global template lama
│   ├── api/                    # Axios client + health API (tidak diubah)
│   ├── auth/
│   │   ├── AuthProvider.tsx    # state sesi, login, logout
│   │   ├── auth-context.ts     # definisi React context
│   │   ├── authStorage.ts      # baca/tulis sesi di browser
│   │   ├── RequireRole.tsx     # guard route owner
│   │   └── useAuth.ts          # hook useAuth
│   ├── components/
│   │   ├── shared/Brand.tsx    # logo EaterSive
│   │   ├── user/UserHeader.tsx # header alur pemesanan
│   │   ├── owner/OwnerShell.tsx# sidebar + topbar owner + footer
│   │   └── StatusPanel.tsx     # komponen template lama
│   ├── data/
│   │   ├── demoAccounts.ts     # akun owner/pelanggan demo
│   │   ├── services.ts         # katalog untuk halaman user
│   │   ├── ownerOrders.ts      # pesanan owner + detail
│   │   ├── ownerCatalog.ts     # katalog awal owner
│   │   ├── ownerReviews.ts     # generator ulasan demo
│   │   └── landingContent.ts   # langkah, testimoni, FAQ landing
│   ├── layouts/MainLayout.tsx  # layout halaman template lama
│   ├── lib/checkout.ts         # currency, cart URL, storage order/alamat
│   ├── pages/
│   │   ├── user/               # 6 halaman user
│   │   ├── owner/              # 5 halaman owner
│   │   └── *.tsx               # halaman template lama
│   ├── routes/AppRoutes.tsx    # semua definisi route
│   ├── styles/                 # 11 CSS hasil konversi, di-scope per halaman
│   └── types/
│       ├── api.ts              # kontrak API template lama
│       ├── auth.ts             # tipe akun dan sesi demo
│       └── eatersive.ts        # tipe layanan, pesanan, ulasan
```

## 6. Sumber Desain → Halaman React

| Folder contoh | Komponen React | Route |
| --- | --- | --- |
| `user ui/eatersive-landing-page` | `pages/user/LandingPage.tsx` | `/` |
| `user ui/login` | `pages/user/LoginPage.tsx` | `/login` |
| `user ui/pilih-layanan` | `pages/user/PilihLayananPage.tsx` | `/layanan` |
| `user ui/pembayaran` | `pages/user/PembayaranPage.tsx` | `/pembayaran` |
| `user ui/konfirmasi-pesanan` | `pages/user/KonfirmasiPesananPage.tsx` | `/konfirmasi-pesanan` |
| `user ui/lacak-pesanan` | `pages/user/LacakPesananPage.tsx` | `/lacak-pesanan` |
| `owner dashboard/eatersive-owner-dashboard` | `pages/owner/OwnerDashboardPage.tsx` | `/owner` |
| `owner dashboard/eatersive-orders` | `pages/owner/OwnerOrdersPage.tsx` | `/owner/orders` |
| `owner dashboard/eatersive-order-detail` | `pages/owner/OwnerOrderDetailPage.tsx` | `/owner/orders/:orderId` |
| `owner dashboard/eatersive-catalog` | `pages/owner/OwnerCatalogPage.tsx` | `/owner/catalog` |
| `owner dashboard/eatersive-reviews` | `pages/owner/OwnerReviewsPage.tsx` | `/owner/reviews` |

Folder `frontend examples/` tidak diubah dan tetap menjadi referensi desain.

## 7. Alur Data

### Alur pemesanan user

```text
/layanan
  pilih layanan → state keranjang (React)
  klik checkout
    ↓
/pembayaran?items={"basic":1}
  alamat → localStorage (eatersive-checkout-address)
  klik booking
    ↓
sessionStorage (eatersive-confirmation-order)
    ↓
/konfirmasi-pesanan
  tampilkan rincian demo + catatan bahwa belum dikirim ke server
  klik lacak
    ↓
/lacak-pesanan
  timeline simulasi + form ulasan
  ulasan → localStorage (eatersive-order-review)
```

Catatan:

- Pesanan **tidak** dikirim ke backend; tidak ada klaim pembayaran/pesanan berhasil di server.
- Nominal memakai `Intl.NumberFormat('id-ID')` melalui `formatCurrency()`.
- Parameter `items` divalidasi terhadap `SERVICE_BY_ID` sebelum dipakai.

### Data owner

- Data awal pesanan: `src/data/ownerOrders.ts`.
- Perubahan status pesanan: `localStorage` dengan key `eatersive-order-progress-<ORDER_ID>`.
- CRUD katalog: `localStorage` dengan key `eatersive-owner-catalog`.
- Moderasi ulasan dan balasan: `localStorage` dengan key `eatersive-owner-reviews`.
- Semua aksi menampilkan pesan bahwa perubahan disimpan di perangkat, bukan di server.

## 8. Strategi Styling

- Setiap stylesheet contoh disalin ke `src/styles/<halaman>.css` dan seluruh selector diberi prefix `#page-<halaman>`.
- Prefix mencegah benturan antar desain, misalnya `.button`, `.status`, `.page-heading`, atau `.sidebar` yang dipakai di lebih dari satu halaman.
- Markup React tetap memakai nama class asli (`className="service-card"`), sehingga hasil visual mendekati contoh.
- `index.html` memuat Google Fonts DM Sans dan Manrope seperti contoh.
- Komponen bersama (`Brand`, `UserHeader`, `OwnerShell`) memakai class yang sama; gaya tetap berasal dari stylesheet halaman aktif.
- `src/styles/login.css` mendapat tambahan kecil untuk kotak akun demo, notice redirect, dan pesan error.

## 9. Komponen Bersama

| Komponen | Fungsi |
| --- | --- |
| `Brand` | Logo dan wordmark EaterSive; varian `shoe` dan `spark` |
| `UserHeader` | Header halaman user, navigasi landing, akun aktif/logout |
| `OwnerShell` | Sidebar owner, topbar mobile, scrim, nav aktif, tombol logout |
| `OwnerFooter` | Footer dashboard dengan status netral (data demo) |
| `RequireRole` | Guard route berdasarkan role sesi |

## 10. Mock Data dan Keterbatasan

> Data contoh sudah dihapus; lihat `DATA_CLEANUP.md` untuk daftar data yang dihapus dan keadaan kosong yang menggantikannya. Poin-poin di bawah menjelaskan kondisi sebelum pembersihan.

- Belum ada endpoint backend untuk order, katalog, review, atau auth. Semua data tersebut adalah mock/localStorage.
- Login demo tidak aman untuk produksi dan tidak terhubung ke Laravel.
- Owner route dilindungi di sisi client saja; guard server belum ada.
- Gambar memakai URL Unsplash dan font memakai Google Fonts, sama seperti contoh asli, sehingga membutuhkan koneksi internet.
- Halaman template lama dan `api/client.ts` tidak diubah.
- Ketika backend siap, ganti pembacaan `src/data/*` dan `src/lib/checkout.ts` dengan service API di `src/api/` tanpa mengubah tampilan halaman.

## 11. Verifikasi yang Sudah Dilakukan

- `npm run lint` — lulus.
- `npm run typecheck` — lulus.
- `npm run build` — lulus.
- Uji DOM headless Chrome untuk 11 halaman: alur pilih layanan → pembayaran → konfirmasi → pelacakan, filter pencarian, dialog katalog, balasan ulasan, update status pesanan, menu mobile, dan tidak ada overflow horizontal pada lebar 390px.
- Uji login demo: owner diarahkan ke `/owner`, pelanggan ke `/layanan`, kredensial salah menampilkan error, dan route owner tanpa login diarahkan ke `/login`.
