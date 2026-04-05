import { getApiClient } from './client';
import { IS_MOCK } from './mock';

export interface TimeSlot {
  id: string;
  time: string;
  is_available: boolean;
}

export interface BookingCreate {
  specialist_id: string;
  service_id: string;
  slot_id: string;
  date: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  specialist_id: string;
  specialist_name: string;
  specialist_avatar?: string;
  service_name: string;
  service_price: number;
  service_duration: number;
  date: string;
  time: string;
  status: BookingStatus;
  created_at: string;
  address?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '13:00', '13:30', '14:00', '14:30', '15:00',
  '15:30', '16:00', '17:00', '18:00',
];
const BUSY_INDICES = new Set([1, 4, 7, 12]);

function generateMockSlots(date: string): TimeSlot[] {
  return MOCK_TIMES.map((time, i) => ({
    id: `slot-${date}-${i}`,
    time,
    is_available: !BUSY_INDICES.has(i),
  }));
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const mockBookingsStore: Booking[] = [
  {
    id: 'b1',
    specialist_id: '1',
    specialist_name: 'Мария Иванова',
    service_name: 'Маникюр с гель-лаком',
    service_price: 1800,
    service_duration: 90,
    date: daysFromNow(3),
    time: '14:00',
    status: 'confirmed',
    created_at: new Date().toISOString(),
    address: 'ул. Садовая, 15',
  },
  {
    id: 'b2',
    specialist_id: '4',
    specialist_name: 'Елена Козлова',
    service_name: 'Коррекция бровей',
    service_price: 800,
    service_duration: 45,
    date: daysFromNow(-7),
    time: '11:00',
    status: 'completed',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'b3',
    specialist_id: '2',
    specialist_name: 'Ольга Смирнова',
    service_name: 'Массаж спины',
    service_price: 2500,
    service_duration: 60,
    date: daysFromNow(-14),
    time: '16:00',
    status: 'cancelled',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

// ─── API ──────────────────────────────────────────────────────────────────────

export const getSlots = async (specialistId: string, date: string): Promise<TimeSlot[]> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    return generateMockSlots(date);
  }
  const api = getApiClient();
  const { data } = await api.get<TimeSlot[]>(`/specialists/${specialistId}/slots/?date=${date}`);
  return data;
};

export const createBooking = async (
  payload: BookingCreate,
  meta: { specialist_name: string; service_name: string; service_price: number; service_duration: number; time: string },
): Promise<Booking> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 700));
    const booking: Booking = {
      id: `b${Date.now()}`,
      specialist_id: payload.specialist_id,
      specialist_name: meta.specialist_name,
      service_name: meta.service_name,
      service_price: meta.service_price,
      service_duration: meta.service_duration,
      date: payload.date,
      time: meta.time,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    };
    mockBookingsStore.unshift(booking);
    return booking;
  }
  const api = getApiClient();
  const { data } = await api.post<Booking>('/bookings/', payload);
  return data;
};

export const getBookings = async (): Promise<Booking[]> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    return [...mockBookingsStore];
  }
  const api = getApiClient();
  const { data } = await api.get<{ results: Booking[] }>('/bookings/');
  return data.results;
};

export const getBookingById = async (id: string): Promise<Booking> => {
  if (IS_MOCK) {
    const b = mockBookingsStore.find(b => b.id === id);
    if (!b) throw new Error('Booking not found');
    return { ...b };
  }
  const api = getApiClient();
  const { data } = await api.get<Booking>(`/bookings/${id}/`);
  return data;
};

export const cancelBooking = async (bookingId: string): Promise<void> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    const b = mockBookingsStore.find(b => b.id === bookingId);
    if (b) b.status = 'cancelled';
    return;
  }
  const api = getApiClient();
  await api.post(`/bookings/${bookingId}/cancel/`);
};
