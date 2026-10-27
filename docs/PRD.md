# Product Requirement Document (PRD)

## 1. Informasi Proyek (Project Overview)
* **Nama Produk:** Eatersive (Layanan Jasa Cuci Sepatu Online)
* **Product Manager (PM):** Pak Mualif
* **Status Proyek:** Draft / In Planning
* **Tanggal Peluncuran (Target Launch Date):** *TBD (To Be Determined)*

---

## 2. Latar Belakang & Rumusan Masalah (Problem Statement)
### Latar Belakang
Proses pemesanan jasa cuci sepatu saat ini masih tergolong manual. Pelanggan umumnya harus memesan melalui aplikasi pesan singkat seperti WhatsApp atau pesan langsung di Instagram.

### Masalah Utama
1. **Sisi Pelanggan:** Harus menunggu balasan pesan (*slow response*) dari pihak penyedia jasa untuk konfirmasi layanan dan pembayaran.
2. **Sisi Pemilik (Owner):** Pengelolaan pesan sangat tidak efektif. Chat dari pelanggan sering kali tertumpuk oleh chat lainnya, yang berpotensi menyebabkan pesanan terlewat atau lambat diproses.

---

## 3. Tujuan Produk (Goals & Objectives)
* **Mengembangkan Website Pemesanan Online:** Memberikan kenyamanan kepada pelanggan untuk memesan dan membayar layanan cuci sepatu kapan saja tanpa harus menunggu balasan chat manual.
* **Menyediakan Dashboard Management:** Membantu pemilik usaha (*owner*) dalam memantau, mengelola, serta memproses seluruh pesanan masuk secara akurat dan terorganisir.

---

## 4. Pengguna Target (User Personas / Roles)
1. **Calon Pelanggan / Customer:** Pengguna yang ingin memesan layanan cuci sepatu, melakukan pembayaran, dan memberikan ulasan/layanan.
2. **Owner / Admin Jasa:** Pemilik usaha yang mengelola katalog layanan, mengubah harga, memantau daftar pesanan, dan mengoperasikan status pemrosesan sepatu.

---

## 5. Fitur Utama (Core Features)

| No | Fitur | Peran (Role) | Deskripsi |
| :--- | :--- | :--- | :--- |
| **F-01** | Pemesanan Online | Customer | Pelanggan dapat memilih jenis layanan cuci sepatu, mengisi detail pesanan, dan jadwal penyerahan/pengambilan. |
| **F-02** | Pembayaran Online | Customer | Integrasi sistem pembayaran (Payment Gateway) untuk memproses transaksi secara langsung dan instan. |
| **F-03** | Ulasan & Review | Customer | Pelanggan dapat memberikan rating dan ulasan terhadap kualitas layanan setelah pesanan selesai. |
| **F-04** | Dashboard Pemantauan | Owner | Halaman khusus untuk melihat seluruh transaksi, status pesanan masuk, dan riwayat pesanan. |
| **F-05** | Manajemen Katalog & Harga| Owner | Fitur CRUD (Create, Read, Update, Delete) untuk menambah, mengubah, atau menghapus menu layanan beserta harganya. |
| **F-06** | Pemrosesan Pesanan | Owner | Mengubah status pesanan pelanggan (misal: *Pending*, *In Progress*, *Ready for Pick-up*, *Completed*). |

---

## 6. Alur Pengguna (User Journey)

### A. Customer Journey
```
[1. Autentikasi / Login] 
       │
       ▼
[2. Eksplorasi & Pilih Jasa] ── (Memilih jenis cuci sepatu)
       │
       ▼
[3. Checkout & Pembayaran] ── (Melakukan pembayaran online)
       │
       ▼
[4. Konfirmasi & Status] ──── (Mendapatkan bukti pemesanan & pantau status)
```

### B. Owner Journey
```
[1. Autentikasi / Login Admin]
       │
       ├──► [2. Dashboard Pesanan] ─── (Melihat daftar pesanan masuk)
       │           │
       │           ▼
       │     [3. Memproses Pesanan] ─ (Update status pengerjaan)
       │
       └──► [4. Manajemen Katalog] ── (Tambah/edit menu layanan & harga)
```

---

## 7. Persyaratan Non-Fungsional (Non-Functional Requirements)
* **Keamanan Data:** Mengamankan kredensial login pengguna dan data transaksi pembayaran.
* **Kemudahan Penggunaan (Usability):** Antarmuka yang ramah pengguna (*responsive design*) baik di perangkat seluler (mobile) maupun desktop.
* **Kinerja (Performance):** Waktu muat halaman cepat untuk kenyamanan pendaftaran dan pemesanan layanan.