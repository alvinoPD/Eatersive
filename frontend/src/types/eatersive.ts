/**
 * Tipe data UI EaterSive.
 *
 * Data pada halaman owner dan alur pemesanan user masih berupa data demo lokal
 * karena backend hanya menyediakan endpoint health/ping. Tipe ini sengaja
 * dipisahkan dari `types/api.ts` supaya kontrak API tetap bersih.
 */

export type ServiceCategory = 'Cleaning' | 'Treatment' | 'Repair' | 'Unyellowing';

export interface CatalogService {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  price: number;
  priceLabel: string;
  estimate: string;
  rating: number;
  reviewCount: number;
  image: string;
  thumbnail: string;
  search: string;
}

/** Jumlah layanan yang dipilih, key adalah id layanan. */
export type CartItems = Record<string, number>;

export interface CheckoutAddress {
  address: string;
  recipient: string;
  phone: string;
  notes: string;
}

export interface CheckoutOrder {
  orderId: string;
  createdAt: string;
  address: CheckoutAddress;
  items: CartItems;
  paymentMethod: string;
}

export type OwnerOrderStatus = 'Selesai' | 'Proses';

export interface OwnerOrder {
  id: string;
  customer: string;
  customerPhone: string;
  customerAvatar: string;
  address: string;
  category: Exclude<ServiceCategory, 'Unyellowing'>;
  service: string;
  estimate: string;
  status: OwnerOrderStatus;
  sequence: number;
  serviceImage: string;
  createdAt: string;
}

export interface OwnerOrderDetail extends OwnerOrder {
  product: string;
  icon: string;
  size: string;
  color: string;
  condition: string;
  paymentService: string;
  servicePrice: number;
  deliveryPrice: number;
  note: string;
}

export interface OrderProgress {
  status: string;
  note: string;
  updatedAt: string;
}

export interface OwnerCatalogService {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  price: number;
  estimate: string;
  active: boolean;
  image: string;
  sequence: number;
}

export type OwnerReviewStatus = 'Dipublikasikan' | 'Menunggu' | 'Dilaporkan' | 'Disembunyikan';

export interface OwnerReview {
  id: string;
  name: string;
  orderId: string;
  rating: number;
  comment: string;
  service: string;
  status: OwnerReviewStatus;
  avatar: string;
  postedAt: string;
  ownerReply?: string;
}
