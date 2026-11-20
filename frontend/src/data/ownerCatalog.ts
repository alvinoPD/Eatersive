import type { OwnerCatalogService } from '../types/eatersive';

export const OWNER_CATALOG_STORAGE_KEY = 'eatersive-owner-catalog';

/**
 * Katalog awal halaman owner.
 *
 * Data contoh sudah dihapus, jadi katalog mulai kosong dan hanya berisi layanan
 * yang benar-benar ditambahkan owner (tersimpan di localStorage).
 */
export const DEFAULT_OWNER_SERVICES: OwnerCatalogService[] = [];
