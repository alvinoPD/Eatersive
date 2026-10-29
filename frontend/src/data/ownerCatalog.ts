import type { OwnerCatalogService } from '../types/eatersive';

export const OWNER_CATALOG_STORAGE_KEY = 'eatersive-owner-catalog';

/** Katalog awal untuk halaman owner. Perubahan disimpan di localStorage. */
export const DEFAULT_OWNER_SERVICES: OwnerCatalogService[] = [
  {
    id: 'srv-basic',
    name: 'Basic',
    description: 'Jasa cuci luar dan dalam',
    category: 'Cleaning',
    price: 65000,
    estimate: '2–3 Hari',
    active: true,
    image:
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=120&h=120&q=80',
    sequence: 5,
  },
  {
    id: 'srv-hard',
    name: 'Hard',
    description: 'Untuk sepatu yang susah dibersihkan',
    category: 'Unyellowing',
    price: 85000,
    estimate: '4–5 Hari',
    active: true,
    image:
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=120&h=120&q=80',
    sequence: 4,
  },
  {
    id: 'srv-suede',
    name: 'Suede / Nubuck',
    description: 'Perbaikan sol sepatu yang lepas',
    category: 'Repair',
    price: 120000,
    estimate: '7 Hari',
    active: true,
    image:
      'https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=120&h=120&q=80',
    sequence: 3,
  },
  {
    id: 'srv-helm',
    name: 'Helm / Bag',
    description: 'Pembersihan instan bagian luar',
    category: 'Cleaning',
    price: 35000,
    estimate: '30 Menit',
    active: true,
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=120&h=120&q=80',
    sequence: 2,
  },
  {
    id: 'srv-hat',
    name: 'Hat / Cap',
    description: 'Perawatan topi dan cap',
    category: 'Treatment',
    price: 45000,
    estimate: '2 Hari',
    active: false,
    image:
      'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=120&h=120&q=80',
    sequence: 1,
  },
];
