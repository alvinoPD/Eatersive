import type { CatalogService } from '../types/eatersive';

/**
 * Katalog layanan untuk halaman user (pilih layanan, pembayaran, pelacakan).
 *
 * Data contoh sudah dihapus. Daftar ini sengaja kosong sampai endpoint katalog
 * backend tersedia; halaman akan menampilkan keadaan kosong sampai saat itu.
 * Saat API siap, isi array ini dari hasil request (`src/api/`) tanpa mengubah
 * markup halaman.
 */
export const SERVICES: CatalogService[] = [];

export const SERVICE_BY_ID: Record<string, CatalogService> = Object.fromEntries(
  SERVICES.map((service) => [service.id, service]),
);

export const SERVICE_CATEGORIES = ['Semua', 'Cleaning', 'Treatment', 'Repair'] as const;
