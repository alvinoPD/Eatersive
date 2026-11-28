# Presentasi Website EaterSive

**Dokumen:** Naskah & panduan presentasi
**Produk:** EaterSive — layanan cuci, perawatan, dan restorasi sepatu
**Stack:** Laravel 13 (API) + React 19 + TypeScript + Vite
**Tanggal:** 25 November 2026

---

## Cara Memakai Dokumen Ini

Dokumen ini disusun seperti presentasi 10–15 menit. Setiap bagian adalah satu “slide”:

- **Judul slide** — tampilkan di deck.
- **Poin utama** — bullet yang bisa masuk slide.
- **Script** — kalimat yang bisa dibacakan.
- **Catatan demo** — kapan harus membuka halaman tertentu.

Jika waktu presentasi hanya 5 menit, gunakan slide 1, 2, 4, 5, 6, dan 15.

---

## Slide 1 — Pembuka: Masalah yang Ingin Diselesaikan

**Poin utama:**

- Pemilik usaha cuci sepatu masih sering mencatat pesanan secara manual.
- Pesanan dari pelanggan tidak selalu sampai ke dashboard owner.
- Pelanggan sulit melacak status sepatunya.
- Diskon member dan pembayaran cash sering dihitung manual.

**Script:**

> “Selamat pagi/siang. Saya ingin memperkenalkan EaterSive, sebuah website layanan cuci sepatu yang menghubungkan pelanggan dan pemilik usaha dalam satu alur digital.
>
> Masalah utamanya sederhana: pelanggan sudah memesan, tetapi pesanannya tidak masuk ke dashboard owner. Akibatnya owner mencatat ulang, pelanggan tidak tahu status sepatunya, dan potensi kesalahan harga serta diskon meningkat.
>
> Website ini dibuat untuk menutup celah tersebut: dari pemilihan layanan, checkout, pembayaran, pelacakan, sampai nota dan laporan owner.”

**Catatan demo:** Belum perlu membuka apa pun. Tampilkan halaman landing sebagai background.

---

## Slide 2 — Solusi: Satu Alur dari Pelanggan ke Owner

**Poin utama:**

- Satu platform untuk customer dan owner.
- Pesanan tersimpan di database, bukan hanya di browser.
- Status pesanan punya riwayat yang bisa dilihat kedua pihak.
- Owner mendapat dashboard, katalog, member, dan nota.

**Script:**

> “EaterSive punya dua sisi. Sisi pelanggan untuk memilih layanan, checkout, upload foto sepatu, memilih pembayaran, dan melacak pesanan. Sisi owner untuk melihat pesanan masuk, mengubah status, menandai pembayaran cash, mengelola katalog, dan mengatur member.
>
> Yang penting: semua data pesanan disimpan di server. Jadi ketika pelanggan menekan tombol booking, pesanan langsung muncul di dashboard owner.”

**Poin teknis singkat:**

```text
React (customer & owner UI)
        │  HTTP + Bearer token
        ▼
Laravel API (/api/v1)
        │
        ▼
MySQL / SQLite
```

---

## Slide 3 — Perjalanan Pelanggan

**Poin utama:**

1. Landing page → lihat layanan dan paket member.
2. Pilih layanan → tentukan jumlah.
3. Checkout → isi alamat, upload foto 4 sisi, pilih pembayaran.
4. Konfirmasi → nomor pesanan, rincian, tombol lacak & nota.
5. Pesanan Saya → riwayat semua pesanan.
6. Lacak → timeline status dari server.
7. Nota → cetak A4.

**Script:**

> “Mari kita ikuti perjalanan pelanggan. Pertama, pelanggan membuka landing page dan melihat layanan yang tersedia. Setelah memilih layanan, ia masuk ke halaman pembayaran.
>
> Di sini ada tiga hal yang saya highlight. Pertama, pelanggan bisa mengunggah empat foto sepatu: depan, kanan, kiri, dan atas. Kedua, pelanggan bisa memilih QRIS atau bayar cash di tempat. Ketiga, jika pelanggan adalah member, diskon langsung terlihat di ringkasan dan totalnya dihitung ulang oleh server.
>
> Setelah booking, pelanggan diarahkan ke halaman konfirmasi yang berisi nomor pesanan, rincian harga, dan tombol untuk melacak, membuka pesanan saya, atau mencetak nota.”

**Catatan demo:**

- Buka `/` → tunjukkan hero carousel yang bergeser otomatis.
- Buka `/layanan` → pilih dua layanan.
- Buka `/pembayaran` → tunjukkan form alamat, empat slot foto, diskon (jika akun member), dan pilihan cash.

---

## Slide 4 — Status Pesanan yang Nyata

**Poin utama:**

- Status bukan simulasi; tersimpan di `pesanan_status_histories`.
- Alur status tidak bisa mundur.
- Setiap perubahan mencatat waktu, catatan, dan siapa yang mengubah.

**Alur status:**

```text
Menunggu
   ↓
Dikonfirmasi
   ↓
Sedang Dikerjakan
   ↓
Pengecekan
   ↓
Selesai

Di titik mana pun (sebelum selesai) → Dibatalkan (wajib catatan)
```

**Script:**

> “Salah satu hal yang sering ditanyakan pelanggan adalah: sepatu saya sudah sampai tahap apa? Karena itu, setiap perubahan status disimpan sebagai riwayat.
>
> Owner tidak bisa melompati tahap atau memundurkan status. Misalnya dari ‘Menunggu’ langsung ke ‘Selesai’ tidak diizinkan. Ini menjaga proses operasional tetap konsisten. Setiap perubahan juga mencatat siapa yang mengubah dan catatannya, sehingga bisa dipertanggungjawabkan.”

**Catatan demo:**

- Buka `/lacak-pesanan?order=...` → tunjukkan timeline.
- Buka detail owner → ubah status satu langkah → kembali ke halaman pelanggan → refresh → status berubah.

---

## Slide 5 — Dashboard Owner

**Poin utama:**

- Metrik dihitung dari database, bukan angka contoh.
- Pendapatan hanya menghitung pembayaran `paid`.
- Grafik 3/6 bulan terakhir.
- Pesanan terbaru bisa langsung dibuka.
- Galeri foto barang terbaru.

**Script:**

> “Di sisi owner, dashboard menampilkan kondisi bisnis hari ini. Ada total pendapatan yang hanya menghitung pembayaran lunas, jumlah pesanan baru, pelanggan aktif, jumlah member, dan total diskon yang diberikan.
>
> Grafik di bawahnya menampilkan pendapatan atau jumlah pesanan per bulan. Owner bisa memilih periode tiga atau enam bulan. Lalu ada tabel lima pesanan terbaru dan galeri foto sepatu yang diunggah pelanggan.
>
> Semua angka ini berasal dari database. Jika tidak ada pesanan, dashboard akan menampilkan keadaan kosong, bukan angka palsu.”

**Catatan demo:**

- Buka `/owner`.
- Tunjukkan metrik, grafik batang, tabel pesanan, dan galeri carousel.

---

## Slide 6 — Member sebagai Paket Subscription

**Poin utama:**

- Member bukan sekadar label; ada paket langganan.
- Owner membuat paket: nama, harga, durasi, diskon.
- Owner mengaktifkan paket untuk pelanggan.
- Diskon otomatis diterapkan saat checkout.
- Diskon disimpan sebagai snapshot agar nota lama tidak berubah.

**Contoh paket:**

| Paket | Harga | Durasi | Diskon |
| :--- | ---: | ---: | ---: |
| Member Bulanan | Rp 50.000 | 30 hari | 10% |
| Member 3 Bulan | Rp 135.000 | 90 hari | 15% |

**Script:**

> “Fitur member kami rancang sebagai subscription. Owner membuat paket, misalnya Member Bulanan dengan harga 50 ribu, durasi 30 hari, dan diskon 10 persen.
>
> Setelah paket aktif, owner bisa membuka halaman Member, mencari pelanggan, lalu mengaktifkan paketnya. Pelanggan tidak perlu memasukkan kode apa pun. Saat checkout berikutnya, sistem mendeteksi membership yang masih berlaku dan langsung menghitung diskon.
>
> Diskon disimpan di baris pesanan. Jadi kalau owner mengubah diskon paket bulan depan, nota pesanan lama tetap menunjukkan diskon saat transaksi terjadi.”

**Catatan demo:**

- Buka `/owner/members`.
- Tunjukkan statistik, tabel paket, dan tabel pelanggan.
- Klik **Atur** pada satu pelanggan → pilih paket → simpan.
- Buka checkout pelanggan tersebut → tunjukkan baris diskon.

---

## Slide 7 — Pembayaran Cash dan QRIS

**Poin utama:**

- Metode: QRIS dan Cash / Bayar di Tempat.
- Status pembayaran: `pending`, `paid`, `failed`, `expired`.
- Cash dilunasi dan ditandai owner dari detail pesanan.
- Pendapatan dashboard baru bertambah setelah `paid`.

**Script:**

> “Untuk pembayaran, saat ini tersedia QRIS dan cash. Saya perlu jujur: QRIS di sini masih berupa pencatatan metode, belum terhubung ke payment gateway. Yang sudah berfungsi penuh adalah cash.
>
> Pelanggan memilih cash, pesanan masuk dengan status pembayaran belum dibayar. Setelah pelanggan membayar tunai, owner membuka detail pesanan dan menekan ‘Tandai Lunas’. Baru setelah itu pendapatan masuk ke dashboard.
>
> Ini penting agar laporan owner tidak menghitung uang yang belum diterima.”

**Catatan demo:**

- Buka detail pesanan cash → tunjukkan tombol **Tandai Lunas (Cash)**.
- Klik → tunjukkan status berubah menjadi **Lunas**.
- Buka dashboard → tunjukkan pendapatan bertambah.

---

## Slide 8 — Foto Sepatu dan Nota

**Poin utama:**

- Pelanggan upload empat sisi: depan, kanan, kiri, atas.
- Satu foto per sisi; upload ulang menggantikan foto lama.
- Foto tampil di konfirmasi, tracking, detail owner, dan nota.
- Nota A4 bisa dicetak, berisi rincian lengkap.

**Script:**

> “Foto sepatu bukan sekadar lampiran. Foto ini menjadi bukti kondisi awal, sehingga mengurangi sengketa antara pelanggan dan owner.
>
> Pelanggan mengunggah empat sisi. Owner melihatnya di detail pesanan dalam bentuk carousel yang bisa digeser. Foto yang sama juga muncul di nota.
>
> Nota dirancang untuk ukuran A4 dan bisa langsung dicetak dari browser. Isinya: identitas toko, nomor pesanan, tanggal, data pelanggan, alamat, rincian layanan, subtotal, diskon, total, metode dan status pembayaran, estimasi selesai, foto empat sisi, dan catatan.”

**Catatan demo:**

- Buka detail owner → geser carousel foto.
- Buka `/nota/{id}` → tekan **Cetak Nota** → tampilkan preview print.

---

## Slide 9 — Landing Page dan Carousel

**Poin utama:**

- Hero tidak lagi diam; gambar bergeser otomatis.
- Bisa menampung 1–5 gambar.
- Ada section paket member.
- Navigasi “Pesanan Saya” untuk pelanggan yang sudah login.

**Script:**

> “Di landing page, hero sekarang berupa carousel yang bergeser otomatis setiap empat detik. Gambar bisa digeser manual lewat tombol, titik navigasi, swipe di layar sentuh, atau panah keyboard.
>
> Saya juga menambahkan section paket member supaya pelanggan tahu ada program langganan, dan link ‘Pesanan Saya’ supaya riwayat pesanan mudah diakses.”

**Catatan demo:**

- Geser hero dengan mouse/touch.
- Tunjukkan section **Paket Member**.

---

## Slide 10 — Arsitektur Teknis

**Poin utama:**

- Frontend: React 19 + TypeScript + Vite.
- Backend: Laravel 13 REST API dengan Sanctum.
- Database relasional.
- Gambar disimpan di storage publik.
- Tidak ada dependency UI tambahan untuk carousel.

**Diagram:**

```text
┌──────────────────────────────┐
│  Browser (React + TS)        │
│  - Customer pages            │
│  - Owner dashboard           │
│  - ImageCarousel             │
└──────────────┬───────────────┘
               │ HTTPS + Bearer token
               ▼
┌──────────────────────────────┐
│  Laravel API (/api/v1)       │
│  - Auth + CAPTCHA            │
│  - Orders & payments         │
│  - Members & plans           │
│  - Catalog & dashboard       │
└──────────────┬───────────────┘
               │ Eloquent
               ▼
┌──────────────────────────────┐
│  Database                    │
│  users, pesanan, pembayarans │
│  membership_plans, dll.      │
└──────────────────────────────┘
               │
               ▼
        storage/app/public
        (foto layanan & pesanan)
```

**Script:**

> “Secara teknis, frontend dan backend dipisah. React hanya menangani tampilan dan memanggil API. Laravel menangani aturan bisnis: harga, diskon, status, kepemilikan pesanan, dan validasi.
>
> Pemisahan ini penting karena harga dan diskon tidak boleh dipercaya dari browser. Server selalu menghitung ulang total. Token Sanctum dipakai untuk autentikasi, dan setiap endpoint pesanan memeriksa apakah pengguna berhak mengakses data tersebut.”

---

## Slide 11 — Model Data

**Poin utama:**

- `users` — pelanggan dan admin.
- `daftar_layanans` — katalog.
- `pesanan` — satu baris per layanan; beberapa baris bisa berbagi `kode_grup`.
- `pembayarans` — metode & status.
- `pesanan_status_histories` — timeline.
- `pesanan_fotos` — foto per `kode_grup` dan sisi.
- `membership_plans` + `user_memberships` — subscription.

**Script:**

> “Relasi paling penting ada di pesanan. Satu checkout bisa berisi beberapa layanan, jadi kami membuat satu baris pesanan per layanan tetapi semuanya berbagi kode grup. Foto sepatu menempel ke kode grup, bukan ke salah satu layanan, karena sepatu yang difoto adalah barang yang sama.
>
> Membership juga dipisah antara paket dan langganan pelanggan. Dengan begitu, satu paket bisa dipakai banyak pelanggan, dan riwayat langganan tetap tersimpan.”

**Catatan teknis:**

- `pesanan.kode_grup` menjadi penghubung multi-layanan dan foto.
- `pesanan` menyimpan `subtotal`, `diskon_persen`, `diskon`, `total_harga` sebagai snapshot.
- `user_memberships.expires_at` menentukan status aktif.

---

## Slide 12 — Keamanan dan Aturan Bisnis

**Poin utama:**

- Harga, diskon, dan total dihitung server.
- Pelanggan hanya bisa melihat pesanannya sendiri.
- Hanya admin yang bisa mengubah status, pembayaran, katalog, dan member.
- Upload foto dibatasi pemilik grup/admin, format, ukuran, dan sisi.
- Transisi status dibatasi.
- Password di-hash; token Sanctum bisa dicabut saat logout.

**Script:**

> “Ada beberapa aturan yang kami kunci di server. Pertama, browser tidak boleh menentukan harga. Kedua, pelanggan tidak bisa melihat pesanan orang lain. Ketiga, hanya admin yang bisa mengubah status dan menandai pembayaran.
>
> Untuk foto, sistem memeriksa apakah pengguna benar-benar pemilik kode grup, membatasi format dan ukuran file, serta hanya mengizinkan satu foto per sisi. Ini mencegah penyalahgunaan storage dan duplikasi data.”

---

## Slide 13 — Masalah Lama yang Diselesaikan

**Poin utama:**

- Fitur pesanan pernah ada, lalu hilang karena regresi commit.
- Checkout lama hanya menyimpan ke `sessionStorage`.
- Route dan controller pesanan hilang.
- Dashboard owner membaca array kosong.

**Script:**

> “Menariknya, fitur ini bukan belum pernah dibuat. Dari riwayat git, fitur pesanan pernah selesai di satu commit, lalu terhapus oleh commit berikutnya yang menambahkan CAPTCHA. Akibatnya checkout kembali ke mode demo, route pesanan hilang, dan dashboard owner membaca data kosong.
>
> Pendekatan kami bukan menulis ulang dari nol, tetapi memulihkan implementasi yang pernah ada, mempertahankan CAPTCHA, lalu menambahkan member, diskon, cash, foto, nota, dan carousel di atasnya.”

**Pesan kunci:**

> “Kami memperbaiki akar masalahnya, bukan hanya menyembunyikan gejalanya.”

---

## Slide 14 — Verifikasi

**Poin utama:**

- 59 test backend lulus.
- 169 assertion.
- Typecheck frontend lulus.
- Build produksi lulus.
- Migrasi dan storage link sudah dijalankan.
- Satu catatan lint lama di `CaptchaField` (bukan bagian perubahan ini).

**Script:**

> “Sebelum diserahkan, kami menjalankan pengujian. Ada 59 test backend dengan 169 assertion, mencakup pembuatan pesanan, diskon member, pembayaran cash, upload foto, hak akses, dashboard, dan katalog.
>
> Frontend lolos typecheck dan build produksi. Kami juga sudah menjalankan migrasi database dan membuat storage link agar foto bisa diakses.
>
> Ada satu catatan jujur: lint masih gagal di satu file lama, CaptchaField, karena aturan React Hooks yang baru. File itu tidak kami ubah dalam pekerjaan ini, dan kegagalannya tidak memengaruhi build.”

---

## Slide 15 — Batasan dan Rencana Berikutnya

**Poin utama:**

- QRIS belum terhubung payment gateway.
- Ulasan owner masih lokal.
- Pembelian membership mandiri belum ada.
- Notifikasi WhatsApp/email belum ada.
- Struk thermal belum ada.

**Script:**

> “Kami memilih menyelesaikan alur inti terlebih dahulu dan tidak berpura-pura semua sudah final.
>
> Batasan saat ini: QRIS masih pencatatan metode, belum payment gateway. Ulasan di halaman owner masih lokal. Pelanggan belum bisa membeli paket member sendiri; owner yang mengaktifkan. Belum ada notifikasi otomatis, dan nota masih A4, bukan struk thermal.
>
> Rencana berikutnya adalah integrasi payment gateway, ulasan server-side, pembelian membership mandiri, notifikasi, dan struk thermal.”

---

## Slide 16 — Penutup

**Poin utama:**

- EaterSive menyatukan pemesanan, pembayaran, produksi, dan laporan.
- Owner mendapat visibilitas; pelanggan mendapat transparansi.
- Fondasi teknis siap dikembangkan.

**Script:**

> “Kesimpulannya, EaterSive bukan hanya website profil. Ini adalah alur operasional: pelanggan memesan, sistem menghitung, owner mengerjakan, status diperbarui, pembayaran dicatat, dan nota diterbitkan.
>
> Dengan fondasi ini, fitur berikutnya seperti payment gateway, notifikasi, dan membership mandiri bisa ditambahkan tanpa membongkar alur yang sudah ada.
>
> Terima kasih. Saya siap menjawab pertanyaan.”

---

## Panduan Demo 5 Menit

Urutan yang disarankan:

| Waktu | Halaman | Yang ditunjukkan |
| :--- | :--- | :--- |
| 0:00–0:30 | `/` | Hero carousel, section member |
| 0:30–1:30 | `/layanan` → `/pembayaran` | Pilih layanan, alamat, 4 foto, cash, diskon |
| 1:30–2:00 | `/konfirmasi-pesanan` | Nomor pesanan, rincian, tombol |
| 2:00–2:30 | `/pesanan-saya` → `/lacak-pesanan` | Riwayat dan timeline server |
| 2:30–3:30 | `/owner` | Metrik, grafik, pesanan terbaru, galeri |
| 3:30–4:15 | `/owner/orders/{id}` | Foto, ubah status, tandai lunas |
| 4:15–4:45 | `/owner/members` | Paket, aktifkan member, diskon |
| 4:45–5:00 | `/nota/{id}` | Nota A4 dan print |

**Tips demo:**

1. Siapkan satu akun customer dan satu akun owner (`role = admin`).
2. Siapkan satu paket member dan satu pelanggan member sebelum presentasi.
3. Gunakan dua jendela browser: satu untuk customer, satu untuk owner.
4. Setelah booking, refresh dashboard owner agar pesanan baru terlihat.
5. Siapkan file foto kecil (JPG/PNG/WebP ≤4 MB) untuk demo upload.
6. Jangan menampilkan data pribadi pelanggan nyata saat presentasi.

---

## Antisipasi Pertanyaan

### “Apakah pembayaran QRIS benar-benar berfungsi?”

> “Belum. QRIS saat ini dicatat sebagai metode pembayaran, tetapi belum terhubung ke payment gateway. Yang sudah berfungsi penuh adalah cash, termasuk penandaan lunas oleh owner. Integrasi gateway adalah rencana berikutnya.”

### “Kenapa diskon dihitung di server?”

> “Agar total tidak bisa dimanipulasi dari browser. Frontend hanya menampilkan estimasi; server menghitung ulang subtotal, diskon, dan total sebelum menyimpan pesanan.”

### “Bagaimana jika dua layanan dipesan sekaligus?”

> “Sistem membuat satu baris pesanan per layanan, tetapi semuanya memakai `kode_grup` yang sama. Foto sepatu menempel pada kode grup karena sepatu yang difoto adalah barang yang sama.”

### “Apakah pelanggan bisa melihat pesanan orang lain?”

> “Tidak. Endpoint detail memeriksa apakah user adalah pemilik pesanan atau admin. Jika bukan, server mengembalikan 403.”

### “Bagaimana cara owner mengubah status?”

> “Owner membuka detail pesanan, memilih status berikutnya yang diizinkan, mengisi catatan bila perlu, lalu menyimpan. Perubahan langsung tercatat di riwayat dan terlihat oleh pelanggan.”

### “Kenapa member memakai tabel terpisah?”

> “Karena member adalah subscription yang punya paket, tanggal mulai, tanggal berakhir, dan diskon. Tabel terpisah membuat riwayat dan perpanjangan lebih jelas dibanding satu kolom `is_member`.”

### “Apakah data lama tetap aman saat migrasi?”

> “Migrasi bersifat aditif dan memakai pengecekan kolom/tabel. Tidak ada `migrate:fresh`, jadi data lama tidak dihapus.”

### “Apa yang belum selesai?”

> “Ulasan server-side, pembelian membership mandiri, payment gateway, notifikasi otomatis, dan struk thermal. Semuanya sudah dicatat sebagai batasan dan rencana lanjutan.”

---

## Glosarium

| Istilah | Arti |
| :--- | :--- |
| **Kode grup** | Kode yang menyatukan beberapa pesanan dari satu checkout |
| **Snapshot diskon** | Nilai diskon yang disimpan saat transaksi agar nota lama tidak berubah |
| **Membership** | Langganan paket yang memberi diskon otomatis |
| **Timeline** | Riwayat perubahan status pesanan |
| **Sanctum** | Sistem token API Laravel |
| **Storage link** | Symlink agar file di `storage/app/public` bisa diakses lewat web |
| **Soft limitation** | Fitur yang sengaja belum dikerjakan dan sudah didokumentasikan |

---

## Penutup Dokumen

Dokumen ini bisa dipakai sebagai:

- naskah presentasi,
- panduan demo,
- bahan Q&A,
- ringkasan onboarding untuk anggota tim baru.

Dokumen teknis pendukung:

- `docs/IMPLEMENTASI_PESANAN_MEMBER_DAN_FITUR_BARU.md` — detail implementasi dan verifikasi.
- `docs/RENCANA_FIX_PESANAN_DAN_FITUR_BARU.md` — rencana awal dan audit masalah.
