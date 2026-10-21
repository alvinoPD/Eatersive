# Backend — Laravel API

Backend REST API untuk template **Laravel + React TypeScript**. Dokumentasi lengkap ada di [`../README.md`](../README.md).

## Menjalankan

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

## Endpoint

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/api/v1/health` | Health check (tidak memerlukan database) |
| GET | `/api/v1/ping` | Contoh endpoint baru: controller + route + feature test |

Periksa daftar route:

```bash
php artisan route:list --path=api
```

## Test

```bash
php artisan test
```

## Catatan

- Konfigurasi CORS ada di `config/cors.php`; daftar origin diambil dari `FRONTEND_URL`.
- Route API didaftarkan di `bootstrap/app.php` (`api: routes/api.php`) dan diberi prefix versi di `routes/api.php`.
- Frontend React berjalan terpisah melalui Vite; folder `public/` hanya dipakai untuk aset backend.
