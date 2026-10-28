import type { OwnerReview, OwnerReviewStatus } from '../types/eatersive';

export const OWNER_REVIEWS_STORAGE_KEY = 'eatersive-owner-reviews';
export const REVIEW_PAGE_SIZE = 5;
export const MOCK_REVIEW_TOTAL = 125;

const templates: Array<
  Pick<OwnerReview, 'name' | 'orderId' | 'rating' | 'comment' | 'service' | 'status' | 'avatar'>
> = [
  {
    name: 'Budi Santoso',
    orderId: 'ORD-9921',
    rating: 5,
    comment: 'Hasilnya sangat memuaskan! Sepatu putih saya kembali bersih dan wangi.',
    service: 'Deep Cleaning',
    status: 'Dipublikasikan',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80',
  },
  {
    name: 'Siti Aminah',
    orderId: 'ORD-9542',
    rating: 3,
    comment: 'Kuning di sol sepatu hampir hilang semua. Memang tidak bisa 100% kan.',
    service: 'Unyellowing',
    status: 'Menunggu',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80',
  },
  {
    name: 'Rizky Ramadhan',
    orderId: 'ORD-9887',
    rating: 5,
    comment: 'Jahitannya rapi sekali dan sol yang lepas sudah kuat lagi. Terima kasih SoleCare!',
    service: 'Shoe Repair',
    status: 'Dipublikasikan',
    avatar:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&h=80&q=80',
  },
  {
    name: 'Dewi Lestari',
    orderId: 'ORD-9851',
    rating: 4,
    comment: 'Waktu pengerjaannya agak lama dari estimasi. Sepatu bersih tapi aromanya masih ada.',
    service: 'Deep Cleaning',
    status: 'Dilaporkan',
    avatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=80&h=80&q=80',
  },
  {
    name: 'Andika Pratama',
    orderId: 'ORD-9512',
    rating: 5,
    comment: 'Mantap! Hasil maksimal dan harga terjangkau. Bakal jadi langganan tetap.',
    service: 'Unyellowing',
    status: 'Disembunyikan',
    avatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80',
  },
];

export function createMockReviews(): OwnerReview[] {
  return Array.from({ length: MOCK_REVIEW_TOTAL }, (_, index) => {
    const template = templates[index % templates.length];
    const duplicateNumber = Math.floor(index / templates.length);
    return {
      id: `review-${index + 1}`,
      name: duplicateNumber === 0 ? template.name : `${template.name} ${duplicateNumber + 1}`,
      orderId:
        duplicateNumber === 0
          ? template.orderId
          : `ORD-${String(9000 + index).slice(-4)}`,
      rating: template.rating,
      comment: template.comment,
      service: template.service,
      status: template.status,
      avatar: template.avatar,
      postedAt: new Date(Date.UTC(2024, 4, 15 - (index % 90))).toISOString(),
    };
  });
}

const REVIEW_STATUSES: OwnerReviewStatus[] = [
  'Dipublikasikan',
  'Menunggu',
  'Dilaporkan',
  'Disembunyikan',
];

export function isOwnerReview(value: unknown): value is OwnerReview {
  if (!value || typeof value !== 'object') return false;
  const review = value as Partial<OwnerReview>;

  return (
    typeof review.id === 'string' &&
    typeof review.name === 'string' &&
    typeof review.orderId === 'string' &&
    Number.isInteger(review.rating) &&
    typeof review.rating === 'number' &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    typeof review.comment === 'string' &&
    typeof review.service === 'string' &&
    typeof review.status === 'string' &&
    REVIEW_STATUSES.includes(review.status as OwnerReviewStatus) &&
    typeof review.avatar === 'string' &&
    typeof review.postedAt === 'string' &&
    (review.ownerReply === undefined ||
      (typeof review.ownerReply === 'string' && review.ownerReply.length <= 500))
  );
}

export function readOwnerReviews(): OwnerReview[] {
  try {
    const saved = window.localStorage.getItem(OWNER_REVIEWS_STORAGE_KEY);
    if (!saved) return createMockReviews();

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isOwnerReview)) {
      return createMockReviews();
    }

    return parsed;
  } catch {
    return createMockReviews();
  }
}
