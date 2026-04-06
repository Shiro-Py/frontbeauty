import { getApiClient } from './client';
import { IS_MOCK } from './mock';

export interface SlotsResponse {
  specialist_id: string;
  date: string;
  slots: string[];   // ["10:00", "11:30"] — только доступные
}

export interface BookingCreate {
  specialist_id: string;
  service_id: string;
  start_datetime: string;  // ISO 8601: "2026-04-10T14:00:00"
}

export type BookingStatus = 'pending' | 'awaiting_payment' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

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
  has_review?: boolean;
}

export interface AppointmentsPage {
  results: Booking[];
  count: number;
  next: string | null;
}

// Вложенная структура от GET /appointments (spec v2.0)
export interface AppointmentWithDetails {
  appointment: {
    id: string;
    specialist_id: string;
    service_id: string;
    start_datetime: string;
    end_datetime: string;
    status: BookingStatus;
    price: number;
    created_at: string;
  };
  specialist: {
    id: string;
    name: string;
    avatar_url: string | null;
    address: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
  };
  can_cancel: boolean;
  can_reschedule: boolean;
  review?: { id: string } | null;
}

function mapAppointment(detail: AppointmentWithDetails): Booking {
  const { appointment, specialist, service } = detail;
  const dt = new Date(appointment.start_datetime);
  const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  return {
    id: appointment.id,
    specialist_id: appointment.specialist_id,
    specialist_name: specialist.name,
    specialist_avatar: specialist.avatar_url ?? undefined,
    service_name: service.name,
    service_price: appointment.price,
    service_duration: service.duration_minutes,
    date: appointment.start_datetime.split('T')[0],
    time,
    status: appointment.status,
    created_at: appointment.created_at,
    address: specialist.address,
    has_review: !!detail.review,
  };
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_AVAILABLE_TIMES = [
  '09:00', '10:00', '10:30', '11:00',
  '12:00', '13:30', '14:00', '15:00',
  '15:30', '17:00', '18:00',
];

function generateMockSlots(date: string): string[] {
  return [...MOCK_AVAILABLE_TIMES];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const mockBookingsStore: Booking[] = [
  {
    id: 'b0',
    specialist_id: '3',
    specialist_name: 'Анна Петрова',
    service_name: 'Стрижка и укладка',
    service_price: 1500,
    service_duration: 75,
    date: daysFromNow(1),
    time: '12:00',
    status: 'awaiting_payment',
    created_at: new Date().toISOString(),
    address: 'ул. Тверская, 10',
  },
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
    address: 'пр. Ленина, 42',
    has_review: false,
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
    address: 'ул. Пушкина, 8',
  },
  {
    id: 'b4',
    specialist_id: '8',
    specialist_name: 'Дарья Федорова',
    service_name: 'Макияж дневной',
    service_price: 2000,
    service_duration: 60,
    date: daysFromNow(-30),
    time: '10:00',
    status: 'completed',
    created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    address: 'ул. Гагарина, 3',
    has_review: true,
  },
];

// ─── API ──────────────────────────────────────────────────────────────────────

export const getSlots = async (specialistId: string, serviceId: string, date: string): Promise<string[]> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    return generateMockSlots(date);
  }
  const api = getApiClient();
  const { data } = await api.get<SlotsResponse>(
    `/specialists/${specialistId}/slots/?date=${date}&service_id=${serviceId}`,
  );
  return data.slots;
};

export const createBooking = async (
  payload: BookingCreate,
  meta: { specialist_name: string; service_name: string; service_price: number; service_duration: number },
): Promise<Booking> => {
  // Извлекаем дату и время из start_datetime для мок-данных
  const [datePart, timePart] = payload.start_datetime.split('T');
  const time = timePart?.slice(0, 5) ?? '';

  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 700));
    const booking: Booking = {
      id: `b${Date.now()}`,
      specialist_id: payload.specialist_id,
      specialist_name: meta.specialist_name,
      service_name: meta.service_name,
      service_price: meta.service_price,
      service_duration: meta.service_duration,
      date: datePart,
      time,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    };
    mockBookingsStore.unshift(booking);
    return booking;
  }
  const api = getApiClient();
  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data } = await api.post<Booking>('/appointments', payload, {
    headers: { 'X-Idempotency-Key': idempotencyKey },
  });
  return data;
};

export const getBookings = async (): Promise<Booking[]> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    return [...mockBookingsStore];
  }
  const api = getApiClient();
  const { data } = await api.get<{ results: AppointmentWithDetails[] }>('/appointments');
  return data.results.map(mapAppointment);
};

const PAST_STATUSES = ['completed', 'cancelled', 'no_show'];

export const getPastAppointments = async (page = 1, pageSize = 20): Promise<AppointmentsPage> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    const past = mockBookingsStore.filter(b => PAST_STATUSES.includes(b.status));
    const start = (page - 1) * pageSize;
    const results = past.slice(start, start + pageSize);
    return {
      results,
      count: past.length,
      next: start + pageSize < past.length ? 'next' : null,
    };
  }
  const api = getApiClient();
  const { data } = await api.get<{ results: AppointmentWithDetails[]; count: number; next: string | null }>(
    `/appointments?status=completed,cancelled,no_show&page=${page}&page_size=${pageSize}`,
  );
  return { results: data.results.map(mapAppointment), count: data.count, next: data.next };
};

const UPCOMING_STATUSES: BookingStatus[] = ['pending', 'awaiting_payment', 'confirmed'];

export const getUpcomingAppointments = async (): Promise<Booking[]> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    return mockBookingsStore.filter(b => UPCOMING_STATUSES.includes(b.status));
  }
  const api = getApiClient();
  const { data } = await api.get<{ results: AppointmentWithDetails[] }>(
    '/appointments?upcoming=true',
  );
  return data.results.map(mapAppointment);
};

export const getBookingById = async (id: string): Promise<Booking> => {
  if (IS_MOCK) {
    const b = mockBookingsStore.find(b => b.id === id);
    if (!b) throw new Error('Booking not found');
    return { ...b };
  }
  const api = getApiClient();
  const { data } = await api.get<AppointmentWithDetails>(`/appointments/${id}`);
  return mapAppointment(data);
};

export const cancelBooking = async (bookingId: string): Promise<void> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    const b = mockBookingsStore.find(b => b.id === bookingId);
    if (b) b.status = 'cancelled';
    return;
  }
  const api = getApiClient();
  await api.patch(`/appointments/${bookingId}/status`, { status: 'cancelled' });
};
