export const SERVICE_CATEGORIES = ['Semua', 'Cleaning', 'Treatment', 'Repair'] as const;

export type FilterCategory = (typeof SERVICE_CATEGORIES)[number];
