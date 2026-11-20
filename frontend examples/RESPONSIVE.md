# Perbaikan Responsive — EaterSive Frontend

Dokumen ini menjelaskan perubahan yang membuat aplikasi React di `frontend/` (hasil konversi desain di folder ini) tampil benar di mobile, tablet, laptop kecil, dan desktop.

- Commit: `fa6877e — Make frontend responsive across devices`
- File berubah: 9 (8 di antaranya CSS/TSX, 1 tipe TypeScript)
- Tidak ada folder, route, komponen, class CSS, animasi, atau alur data yang diubah namanya.

## 1. Prinsip yang Dipakai

- Semua penyesuaian layout dilakukan lewat `@media` di file CSS yang sudah ada, mengikuti selector `#page-*` yang berlaku.
- Satu-satunya perubahan markup adalah tombol hamburger di `UserHeader` — tanpa itu link navigasi tidak bisa dijangkau di mobile.
- Tidak menambah library, tidak memakai `!important` baru, tidak mengubah logika bisnis.
- Desain desktop dipertahankan; dua pengecualian adalah bug layout yang juga terlihat di desktop (overflow halaman landing dan empty state grafik owner), dijelaskan di bagian 3.

Target lebar:

| Rentang | Fokus |
| --- | --- |
| 320–480px | Layout satu kolom, tipografi terbaca, target sentuh ≥40px, tanpa scroll horizontal |
| 481–768px | Grid dua kolom, toolbar membungkus, header tetap rapi |
| 769–1024px | Dua kolom penuh, tanpa overflow dari elemen dekoratif |
| ≥1025px | Tampilan asli tidak berubah |

## 2. Ringkasan Perubahan per File

| File | Perubahan | Alasan |
| --- | --- | --- |
| `src/components/user/UserHeader.tsx` | Tombol hamburger + state `menuOpen` + `aria-expanded`/`aria-controls` | Navigasi hilang di mobile |
| `src/styles/pilih-layanan.css` | Toolbar katalog wrap, panel menu mobile, skala tipografi, grid 1 kolom ≤390px | Toolbar berdesakan, teks terlalu kecil |
| `src/styles/pembayaran.css` | Panel menu mobile, form & tombol lebih tinggi, aksi alamat bertumpuk | Input 10px sulit dipakai di HP |
| `src/styles/konfirmasi-pesanan.css` | Panel menu mobile, skala tipografi kartu pesanan | Teks 8–9px tidak terbaca |
| `src/styles/lacak-pesanan.css` | Panel menu mobile, timeline & form ulasan | Teks kecil, textarea sempit |
| `src/styles/login.css` | Skala label/input/pesan, input 16px | Zoom otomatis iOS & teks kecil |
| `src/styles/landing.css` | `overflow-x: clip`, offset catatan hero di mobile | Scroll horizontal di laptop/desktop |
| `src/styles/owner-dashboard.css` | Empty state grafik melebar penuh | Kolom 43px merusak empty state |
| `src/types/auth.ts` | Interface `DemoAccount` | Build gagal karena tipe belum ada |

## 3. Detail Perbaikan

### 3.1 Header bersama halaman user

Berlaku untuk `/layanan`, `/pembayaran`, `/konfirmasi-pesanan`, `/lacak-pesanan`.

Sebelumnya `.main-nav` hanya diatur `display: none` pada breakpoint mobile, tanpa tombol pembuka. Akibatnya link Layanan, Cara Kerja, Ulasan, dan Pertanyaan tidak bisa diakses sama sekali di HP.

Yang ditambahkan:

- Tombol `.menu-toggle` di markup header dengan `aria-expanded`, `aria-controls="main-nav"`, dan label yang berubah antara "Buka menu"/"Tutup menu".
- Nav mendapat class `is-open` saat terbuka; tiap link memanggil `closeMenu` agar menu tertutup setelah navigasi.
- Pola ini identik dengan menu yang sudah ada di landing page, jadi tidak ada bahasa desain baru.
- CSS tombol dan panel ditambahkan ke empat file CSS halaman (karena tiap halaman memakai prefix `#page-*`), dengan `display: none` di desktop supaya tampilan besar tidak berubah.
- Panel memakai `position: absolute; top: 100%` di bawah header, latar `#f9fafc`, garis pemisah antar link, tombol 38×38px dengan radius 10px, dan animasi ikon menjadi silang.

Breakpoint mengikuti halaman masing-masing: `/layanan` ≤620px, `/pembayaran` ≤560px, `/konfirmasi-pesanan` ≤560px, `/lacak-pesanan` ≤600px.

### 3.2 Landing page

Penyebab scroll horizontal di 820–1280px adalah elemen dekoratif `.hero-orbit` (`width: min(570px, 53vw); right: -15%`) yang melebar melewati viewport.

- `#page-landing { overflow-x: clip; }` — memotong luapan dekoratif tanpa membuat container scroll dan tanpa mengubah posisi/animasi apa pun. Ini juga memperbaiki desktop yang sebelumnya punya scrollbar horizontal.
- Pada ≤850px, `.hero-note` digeser `bottom: -16px` agar keterangan "Dirawat sepenuhnya hati" tidak menempel di tepi foto yang mengecil.

### 3.3 Pilih Layanan (`/layanan`)

- ≤800px: `.catalog-toolbar` membungkus. Kotak cari jadi baris pertama (`flex: 1 1 140px`, `order: 1`), tombol keranjang di kanan baris itu (`order: 2`), dan filter kategori turun ke baris penuh (`width: 100%; order: 3`) dengan garis atas. Tiap filter melebar (`flex: 1`) sehingga "Semua/Cleaning/Treatment/Repair" tidak berdesakan.
- ≤620px: tinggi header 56px, `h1` 32px, paragraf 13px, input cari 13px, filter 36px, judul kartu 13px, rating 11px, deskripsi 11px dengan `-webkit-line-clamp: 3`, harga 14px, tombol tambah 32px, tombol checkout 44px.
- Gambar kartu memakai `height: clamp(125px, 39vw, 220px)` agar proporsional tanpa memotong layout.
- ≤390px: grid layanan menjadi satu kolom (gambar 210px) dan nama pengguna di header disembunyikan agar logo, tombol menu, dan tombol keluar tetap muat.

### 3.4 Pembayaran (`/pembayaran`)

- 561–760px: `.address-actions` bertumpuk (pesan alamat di atas, tombol simpan selebar kartu), input 40px/15px, teks ringkasan 12px/11px.
- ≤560px: input 44px dengan `font-size: 16px` (mencegah zoom otomatis iOS), label 12px, tombol simpan 44px, tombol booking 46px/14px, teks kebijakan/metode 11px, chip e-wallet 9px.
- ≤380px: judul halaman 24px, `.payment-notes` satu kolom, aksi alamat bertumpuk penuh, dan nama pengguna di header disembunyikan.

### 3.5 Konfirmasi Pesanan (`/konfirmasi-pesanan`)

- ≤560px: seluruh teks kartu pesanan dinaikkan ukurannya — status pill 10px, label meta 10px, nilai meta 12px, detail 10–11px, daftar item 11px, total 14px. Pesan pelacakan, kartu bantuan, catatan demo, dan tombol aksi ikut disesuaikan agar tidak ada teks 8–9px yang tersisa.
- ≤380px: nama pengguna di header disembunyikan agar logo, tombol menu, dan tombol keluar tetap muat tanpa memotong isi header.

### 3.6 Lacak Pesanan (`/lacak-pesanan`)

- ≤600px: tipografi timeline (judul 12px, isi 11px, tanggal 9–10px), header ID pesanan, kartu detail item (nama 11px, deskripsi 11px, spesifikasi 10–11px), kotak informasi 11px.
- Form ulasan: label 12px, textarea 14px dengan tinggi minimum 88px, area unggah foto 88px, tombol kirim 46px.
- ≤380px: grid detail menjadi satu kolom, spesifikasi dua kolom dengan kolom terakhir disembunyikan, dan nama pengguna di header disembunyikan.

### 3.7 Login (`/login`)

- ≤480px: label 13px, input 16px (anti zoom iOS), tombol teks 12px, pesan form/notifikasi 12px, judul akun demo 10px, nama 12px, email 11px. Kartu login tetap satu kolom seperti desain asli.

### 3.8 Dashboard owner (`/owner`)

Empty state grafik sebelumnya berada di dalam grid `43px minmax(0, 1fr)` sehingga teks "Grafik pendapatan … belum ada data" terjepit di kolom 43px. Sekarang:

```css
#page-owner-dashboard .chart-wrap .empty-state {
  grid-column: 1 / -1;
  align-self: center;
  padding: 20px 12px;
  line-height: 1.6;
}
```

Berlaku di semua lebar karena memang bug pada kondisi kosong, bukan perubahan desain grafik saat ada data.

### 3.9 Build yang tadinya gagal

`src/data/demoAccounts.ts` mengimpor `DemoAccount` dari `src/types/auth.ts`, tetapi tipe itu tidak pernah didefinisikan, sehingga `npm run build` (`tsc -b`) gagal dengan `TS2305`. Interface ditambahkan apa adanya sesuai bentuk objek yang sudah dipakai:

```ts
export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AuthRole;
}
```

Tidak ada perubahan perilaku — hanya deklarasi tipe.

## 4. Yang Sengaja Tidak Diubah

- Struktur folder, nama file, nama komponen, dan nama class CSS.
- Route dan proteksi role (`RequireRole`), alur checkout, penyimpanan sesi, serta integrasi API.
- Semua section, animasi, dan ilustrasi landing page.
- Tampilan desktop: seluruh aturan baru berada di dalam media query mobile/tablet, kecuali dua perbaikan bug di 3.2 dan 3.8.
- Tabel di halaman owner (Pesanan, Kelola Katalog, Review) tetap memakai scroll horizontal di layar kecil. Mengubahnya menjadi kartu berarti mengubah struktur tabel dan di luar cakupan perbaikan responsive.

## 5. Verifikasi

Metode: Chrome headless dikendalikan lewat Chrome DevTools Protocol pada dev server lokal, dengan data uji dari mock API lokal.

| Pemeriksaan | Cakupan | Hasil |
| --- | --- | --- |
| Overflow horizontal | 13 route × 11 lebar (320–1440px) | `document.scrollWidth` sama dengan lebar viewport di semua kombinasi. Sebelum perbaikan, `/` meluap pada 820px ke atas. |
| Ketersediaan navigasi | 6 route ber-header × 15 lebar (320–1024px) | Selalu tepat satu navigasi terlihat (menu desktop atau hamburger), dan nav tidak pernah melewati tepi viewport. |
| Interaksi menu | `/layanan` @360px | Menu tertutup → klik tombol → `display: flex`, `aria-expanded="true"` → klik "Cara Kerja" → URL `/#cara-kerja`, menu tertutup kembali. |
| Dialog katalog owner | `/owner/catalog` @320×780 | Dialog `Tambah Layanan` berada 16px dari tepi kiri/kanan dan tidak terpotong. |
| Build | `npm run build` | Lolos: `tsc -b` + `vite build` (128 module). |

Pemeriksaan visual (screenshot penuh) dilakukan pada 320, 360, 375, 768, 900, 1024, dan 1440px untuk landing, layanan, pembayaran, konfirmasi pesanan, lacak pesanan, login, empat halaman owner, about, api-status, dan template.

## 6. Limitasi

- Tabel owner tetap scroll horizontal di mobile (lihat bagian 4).
- Placeholder input yang panjang (mis. "Cari layanan cuci, unyellowing, repaint…") terpotong di 320px. Ini perilaku normal input satu baris, bukan overflow layout.
- Menu mobile belum menutup lewat tombol Escape atau klik di luar area; perilakunya mengikuti menu landing page yang sudah ada.
- Pengujian data memakai mock lokal, belum backend Laravel yang baru. Pengujian perangkat fisik dan Safari/iOS juga belum dilakukan.

## 7. Cara Cek Manual

```bash
cd frontend
npm run dev
```

Buka `http://localhost:5173`, lalu di DevTools aktifkan mode device dan uji lebar 320, 375, 414, 480, 768, 1024, dan 1440.

Checklist cepat:

1. Tidak ada scrollbar horizontal di setiap route pada lebar di atas.
2. Di ≤620px, tombol hamburger membuka menu dan setiap link bisa diklik.
3. Tidak ada teks yang bertumpuk dengan gambar/tombol.
4. Input dan tombol nyaman disentuh (≥40px) dan form bisa diisi.
5. Tampilan ≥1025px sama seperti desain asli.
