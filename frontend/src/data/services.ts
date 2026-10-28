import type { CatalogService } from '../types/eatersive';

/**
 * Katalog demo untuk halaman user (pilih layanan, pembayaran, pelacakan).
 * Belum ada endpoint katalog di backend, jadi data ini murni untuk tampilan.
 */
export const SERVICES: CatalogService[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Jasa cuci luar dan dalam',
    category: 'Cleaning',
    price: 35000,
    priceLabel: 'Rp 35.000',
    estimate: '2–3 Hari',
    rating: 4.9,
    reviewCount: 1240,
    image:
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=160&q=75',
    search: 'basic cleaning cuci luar dalam sepatu',
  },
  {
    id: 'hard',
    name: 'Hard',
    description: 'Untuk sepatu berlumur yang susah dibersihkan',
    category: 'Treatment',
    price: 40000,
    priceLabel: 'Rp 40.000',
    estimate: '2–3 Hari',
    rating: 4.8,
    reviewCount: 856,
    image:
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=160&q=75',
    search: 'hard deep cleaning treatment sepatu',
  },
  {
    id: 'suede',
    name: 'Suede / Nubuck',
    description:
      'Treatment khusus sepatu suede/nubuck, 3M (Menyegarkan, Menghidupkan, Melembutkan)',
    category: 'Repair',
    price: 50000,
    priceLabel: 'Rp 50.000',
    estimate: '2–4 Hari',
    rating: 4.7,
    reviewCount: 452,
    image:
      'https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=800&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=160&q=75',
    search: 'suede nubuck treatment repair sepatu kulit',
  },
  {
    id: 'helm',
    name: 'Helm & Bag',
    description:
      'Perawatan helm & tas untuk mengangkat noda dan menjaga kualitas material.',
    category: 'Cleaning',
    price: 30000,
    priceLabel: 'Rp 30.000 – 50.000',
    estimate: '24 Jam',
    rating: 4.9,
    reviewCount: 2105,
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=160&q=75',
    search: 'helm bag tas cleaning cuci',
  },
  {
    id: 'hat',
    name: 'Hat / Cap',
    description:
      'Perawatan topi untuk mengangkat noda dan menjaga bentuk serta kualitas bahan.',
    category: 'Treatment',
    price: 30000,
    priceLabel: 'Rp 30.000',
    estimate: '2–3 Hari',
    rating: 4.8,
    reviewCount: 370,
    image:
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=800&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=160&q=75',
    search: 'hat cap topi treatment cleaning',
  },
  {
    id: 'kids',
    name: 'Flat Shoes & Kid Shoes',
    description:
      'Perawatan flat shoes & sepatu anak untuk membersihkan noda dan menjaga kualitas serta kenyamanan sepatu.',
    category: 'Treatment',
    price: 25000,
    priceLabel: 'Rp 25.000 – 30.000',
    estimate: '7–10 Hari',
    rating: 4.6,
    reviewCount: 189,
    image:
      'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=800&q=85',
    thumbnail:
      'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=160&q=75',
    search: 'flat shoes kid shoes sepatu anak',
  },
];

export const SERVICE_BY_ID: Record<string, CatalogService> = Object.fromEntries(
  SERVICES.map((service) => [service.id, service]),
);

export const SERVICE_CATEGORIES = ['Semua', 'Cleaning', 'Treatment', 'Repair'] as const;
