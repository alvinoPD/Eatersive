import type { OwnerOrder, OwnerOrderDetail } from '../types/eatersive';

/**
 * Daftar pesanan halaman owner.
 *
 * Data contoh sudah dihapus. Belum ada endpoint pesanan di backend, jadi daftar
 * ini kosong dan halaman menampilkan keadaan kosong sampai API tersedia.
 */
export const OWNER_ORDERS: OwnerOrderDetail[] = [];

export const OWNER_ORDER_BY_ID: Record<string, OwnerOrderDetail> = Object.fromEntries(
  OWNER_ORDERS.map((order) => [order.id, order]),
);

/** Tidak ada pesanan default karena tidak ada data contoh. */
export const DEFAULT_OWNER_ORDER_ID = '';

/** Baris ringkas untuk tabel "Pesanan Terbaru" di dashboard owner. */
export const DASHBOARD_RECENT_ORDERS: Array<
  Pick<OwnerOrder, 'id' | 'customer' | 'service'> & {
    status: 'proses' | 'selesai' | 'menunggu' | 'dibatalkan';
    statusLabel: string;
    total: number;
  }
> = [];
