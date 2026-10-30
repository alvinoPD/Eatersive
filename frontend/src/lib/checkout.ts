import type { CartItems, CheckoutAddress, CheckoutOrder } from '../types/eatersive';

export const ADDRESS_STORAGE_KEY = 'eatersive-checkout-address';
export const ORDER_STORAGE_KEY = 'eatersive-confirmation-order';

export const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

/** Parse parameter `items` dari URL checkout dengan validasi id dan jumlah. */
export function parseCartItems(rawItems: string | null): CartItems {
  if (!rawItems) return {};

  try {
    const parsed: unknown = JSON.parse(rawItems);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, number] =>
          typeof entry[0] === 'string' &&
          entry[0].length > 0 &&
          typeof entry[1] === 'number' &&
          Number.isInteger(entry[1]) &&
          entry[1] > 0 &&
          entry[1] <= 99,
      ),
    );
  } catch {
    return {};
  }
}

export function readCheckoutAddress(): Partial<CheckoutAddress> | null {
  try {
    const saved = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
    if (!saved) return null;

    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const address: Partial<CheckoutAddress> = {};
    for (const key of ['address', 'recipient', 'phone', 'notes'] as const) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === 'string') address[key] = value;
    }

    return address;
  } catch {
    return null;
  }
}

export function saveCheckoutAddress(address: CheckoutAddress): void {
  window.localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(address));
}

export function saveConfirmationOrder(order: CheckoutOrder): void {
  window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
}

export function readConfirmationOrder(): CheckoutOrder | null {
  try {
    const rawOrder = window.sessionStorage.getItem(ORDER_STORAGE_KEY);
    if (!rawOrder) return null;

    const parsed: unknown = JSON.parse(rawOrder);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const candidate = parsed as Partial<CheckoutOrder>;
    const items = Object.fromEntries(
      Object.entries(candidate.items ?? {}).filter(
        (entry): entry is [string, number] =>
          typeof entry[0] === 'string' &&
          entry[0].length > 0 &&
          typeof entry[1] === 'number' &&
          Number.isInteger(entry[1]) &&
          entry[1] > 0 &&
          entry[1] <= 99,
      ),
    );

    if (Object.keys(items).length === 0) return null;

    const address: CheckoutAddress = {
      address: '',
      recipient: '',
      phone: '',
      notes: '',
      ...(candidate.address && typeof candidate.address === 'object' ? candidate.address : {}),
    };
    const createdAt =
      typeof candidate.createdAt === 'string' && !Number.isNaN(Date.parse(candidate.createdAt))
        ? candidate.createdAt
        : new Date().toISOString();

    return {
      orderId: typeof candidate.orderId === 'string' ? candidate.orderId : 'ORD-DEMO',
      createdAt,
      address,
      items,
      paymentMethod:
        typeof candidate.paymentMethod === 'string'
          ? candidate.paymentMethod
          : 'QRIS / E-Wallet',
    };
  } catch {
    return null;
  }
}
