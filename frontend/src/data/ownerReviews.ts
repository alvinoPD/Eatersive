import type { OwnerReview, OwnerReviewStatus } from '../types/eatersive';

export const OWNER_REVIEWS_STORAGE_KEY = 'eatersive-owner-reviews';
export const REVIEW_PAGE_SIZE = 5;

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

/**
 * Ulasan dimulai kosong: tidak ada lagi ulasan contoh yang dibuat otomatis.
 * Hanya ulasan yang benar-benar dimoderasi owner (tersimpan di localStorage)
 * yang ditampilkan.
 */
export function readOwnerReviews(): OwnerReview[] {
  try {
    const saved = window.localStorage.getItem(OWNER_REVIEWS_STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isOwnerReview)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}
