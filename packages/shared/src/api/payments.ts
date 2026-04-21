import { getApiClient } from './client';
import { IS_MOCK } from './mock';

export interface SavedCard {
  id: string;
  card_type: 'Visa' | 'MasterCard' | 'Mir' | 'UnionPay' | 'Unknown';
  last4: string;
  expiry_month: number;
  expiry_year: number;
}

export type PaymentStatus = 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';

export interface PaymentResult {
  payment_id: string;
  status: PaymentStatus;
  confirmation_url?: string | null;
  amount: number;
}

export interface PaymentHistoryItem {
  id: string;
  booking_id: string;
  specialist_name: string;
  service_name: string;
  amount: number;
  status: 'succeeded' | 'canceled' | 'refunded';
  created_at: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockCards: SavedCard[] = [
  { id: 'c1', card_type: 'Mir',        last4: '3456', expiry_month: 11, expiry_year: 27 },
  { id: 'c2', card_type: 'Visa',       last4: '7890', expiry_month: 3,  expiry_year: 26 },
  { id: 'c3', card_type: 'MasterCard', last4: '1234', expiry_month: 8,  expiry_year: 28 },
];

const mockHistory: PaymentHistoryItem[] = [
  {
    id: 'p1', booking_id: 'b2', specialist_name: 'Елена Козлова',
    service_name: 'Коррекция бровей', amount: 800,
    status: 'succeeded', created_at: '2026-03-10T11:00:00Z',
  },
  {
    id: 'p2', booking_id: 'b4', specialist_name: 'Дарья Федорова',
    service_name: 'Макияж дневной', amount: 2000,
    status: 'succeeded', created_at: '2026-02-22T10:30:00Z',
  },
  {
    id: 'p3', booking_id: 'b3', specialist_name: 'Ольга Смирнова',
    service_name: 'Массаж спины', amount: 2500,
    status: 'canceled', created_at: '2026-02-07T16:00:00Z',
  },
];

let _mockPaymentStore = new Map<string, PaymentResult>();

// ─── API ──────────────────────────────────────────────────────────────────────

export const createPayment = async (
  bookingId: string,
  opts?: { save_card?: boolean; payment_method_id?: string },
): Promise<PaymentResult> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 600));
    const paymentId = `pay_${bookingId}_${Date.now()}`;
    // Saved card → instant success; new card → returns confirmation URL
    const result: PaymentResult = opts?.payment_method_id
      ? { payment_id: paymentId, status: 'succeeded', amount: 0, confirmation_url: null }
      : {
          payment_id: paymentId,
          status: 'pending',
          amount: 0,
          confirmation_url: `https://yookassa.ru/checkout/payments/${paymentId}`,
        };
    _mockPaymentStore.set(paymentId, result);
    return result;
  }
  const api = getApiClient();
  const { data } = await api.post<PaymentResult>('/payments/create/', {
    booking_id: bookingId,
    ...opts,
  });
  return data;
};

export const getPaymentStatus = async (paymentId: string): Promise<PaymentResult> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 500));
    const existing = _mockPaymentStore.get(paymentId);
    if (existing) {
      const updated = { ...existing, status: 'succeeded' as PaymentStatus };
      _mockPaymentStore.set(paymentId, updated);
      return updated;
    }
    return { payment_id: paymentId, status: 'succeeded', amount: 0 };
  }
  const api = getApiClient();
  const { data } = await api.get<PaymentResult>(`/payments/${paymentId}/`);
  return data;
};

export const getSavedCards = async (): Promise<SavedCard[]> => {
  if (IS_MOCK) return [...mockCards];
  const api = getApiClient();
  const { data } = await api.get<SavedCard[]>('/payments/cards/');
  return data;
};

export const deleteSavedCard = async (cardId: string): Promise<void> => {
  if (IS_MOCK) {
    const idx = mockCards.findIndex(c => c.id === cardId);
    if (idx !== -1) mockCards.splice(idx, 1);
    return;
  }
  const api = getApiClient();
  await api.delete(`/payments/cards/${cardId}/`);
};

export const getPaymentHistory = async (): Promise<PaymentHistoryItem[]> => {
  if (IS_MOCK) return [...mockHistory];
  const api = getApiClient();
  const { data } = await api.get<PaymentHistoryItem[]>('/payments/history/');
  return data;
};
