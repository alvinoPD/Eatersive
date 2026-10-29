import type { OwnerOrder, OwnerOrderDetail } from '../types/eatersive';

/**
 * Data demo pesanan untuk dashboard owner. Belum ada endpoint pesanan di
 * backend, jadi seluruh data di sini bersifat contoh.
 */
export const OWNER_ORDERS: OwnerOrderDetail[] = [
  {
    id: 'ORD-6758892',
    customer: 'Rio Amamiya',
    customerPhone: '+62 812-3456-7890',
    customerAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
    address: 'Jl. Diponegoro No. 18, Surabaya, 60241',
    category: 'Cleaning',
    service: 'Basic',
    estimate: '2–3 Hari',
    status: 'Selesai',
    sequence: 5,
    serviceImage:
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=120&h=120&q=80',
    createdAt: '2026-09-24T09:30:00',
    product: 'Nike Air Force 1',
    icon: '👟',
    size: '41',
    color: 'White / Orange',
    condition: 'Debu ringan pada upper, outsole sedikit kusam.',
    paymentService: 'Layanan: Basic Cleaning',
    servicePrice: 65000,
    deliveryPrice: 20000,
    note: 'Sepatu selesai dibersihkan dan siap diambil.',
  },
  {
    id: 'ORD-9821039',
    customer: 'Jeong Jaehyun',
    customerPhone: '+62 812-9988-7766',
    customerAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
    address: 'Jl. Kemang Timur No. 12, Jakarta Selatan, 12730',
    category: 'Treatment',
    service: 'Hard',
    estimate: '4–5 Hari',
    status: 'Proses',
    sequence: 4,
    serviceImage:
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=120&h=120&q=80',
    createdAt: '2026-09-24T09:30:00',
    product: 'Air Jordan 1 Retro High',
    icon: '👟',
    size: '42',
    color: 'White / University Blue',
    condition: 'Kotor berat, outsole menguning.',
    paymentService: 'Layanan: Deep Cleaning + Unyellowing',
    servicePrice: 165000,
    deliveryPrice: 20000,
    note: 'Tahap 1: Deep cleaning bagian upper.',
  },
  {
    id: 'ORD-3548992',
    customer: 'Arianto Samsul',
    customerPhone: '+62 813-5566-2211',
    customerAvatar:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&h=100&q=80',
    address: 'Jl. Cempaka No. 7, Bandung, 40123',
    category: 'Repair',
    service: 'Suede / Nubuck',
    estimate: '7 Hari',
    status: 'Proses',
    sequence: 3,
    serviceImage:
      'https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=120&h=120&q=80',
    createdAt: '2026-09-25T11:10:00',
    product: 'New Balance 574 Suede',
    icon: '👟',
    size: '43',
    color: 'Grey / Navy',
    condition: 'Noda pada material suede dan debu di bagian midsole.',
    paymentService: 'Layanan: Suede / Nubuck Treatment',
    servicePrice: 95000,
    deliveryPrice: 20000,
    note: 'Material suede sedang menjalani pembersihan khusus.',
  },
  {
    id: 'ORD-2675492',
    customer: 'Hades Alejandro',
    customerPhone: '+62 812-7766-5544',
    customerAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
    address: 'Jl. Pahlawan No. 22, Semarang, 50241',
    category: 'Cleaning',
    service: 'Helm & Bag',
    estimate: '30 Menit',
    status: 'Proses',
    sequence: 2,
    serviceImage:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=120&h=120&q=80',
    createdAt: '2026-09-26T14:20:00',
    product: 'Helm full-face & sling bag',
    icon: '🪖',
    size: 'L',
    color: 'Black',
    condition: 'Helm dan tas perlu dibersihkan pada bagian dalam.',
    paymentService: 'Layanan: Helm & Bag Cleaning',
    servicePrice: 80000,
    deliveryPrice: 15000,
    note: 'Barang diterima dan sedang diperiksa kondisinya.',
  },
  {
    id: 'ORD-5437895',
    customer: 'Jamalludin Mansyur',
    customerPhone: '+62 857-3344-9900',
    customerAvatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80',
    address: 'Jl. Merdeka No. 5, Yogyakarta, 55231',
    category: 'Treatment',
    service: 'Hat/Cap',
    estimate: '10–14 Hari',
    status: 'Selesai',
    sequence: 1,
    serviceImage:
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=120&h=120&q=80',
    createdAt: '2026-09-27T08:45:00',
    product: 'New Era 9FORTY Cap',
    icon: '🧢',
    size: 'All size',
    color: 'Black / White',
    condition: 'Noda keringat ringan di bagian dalam topi.',
    paymentService: 'Layanan: Hat / Cap Treatment',
    servicePrice: 45000,
    deliveryPrice: 20000,
    note: 'Treatment selesai, topi sudah dikemas untuk pengantaran.',
  },
];

export const OWNER_ORDER_BY_ID: Record<string, OwnerOrderDetail> = Object.fromEntries(
  OWNER_ORDERS.map((order) => [order.id, order]),
);

export const DEFAULT_OWNER_ORDER_ID = 'ORD-9821039';

/** Baris ringkas untuk tabel "Pesanan Terbaru" di dashboard owner. */
export const DASHBOARD_RECENT_ORDERS: Array<
  Pick<OwnerOrder, 'id' | 'customer' | 'service'> & {
    status: 'proses' | 'selesai' | 'menunggu' | 'dibatalkan';
    statusLabel: string;
    total: number;
  }
> = [
  {
    id: 'ORD-7214',
    customer: 'Budi Santoso',
    service: 'Deep Cleaning',
    status: 'proses',
    statusLabel: 'Diproses',
    total: 85000,
  },
  {
    id: 'ORD-7213',
    customer: 'Siti Aminah',
    service: 'Unyellowing',
    status: 'selesai',
    statusLabel: 'Selesai',
    total: 120000,
  },
  {
    id: 'ORD-7212',
    customer: 'Andi Wijaya',
    service: 'Repair & Glue',
    status: 'menunggu',
    statusLabel: 'Menunggu',
    total: 150000,
  },
  {
    id: 'ORD-7211',
    customer: 'Rina Kartika',
    service: 'Deep Cleaning',
    status: 'selesai',
    statusLabel: 'Selesai',
    total: 85000,
  },
  {
    id: 'ORD-7210',
    customer: 'Doni Setiawan',
    service: 'Reglue',
    status: 'dibatalkan',
    statusLabel: 'Dibatalkan',
    total: 65000,
  },
];
