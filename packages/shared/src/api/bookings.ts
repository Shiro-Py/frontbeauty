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

export type BookingStatus = 'pending' | 'awaiting_payment' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

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

// ─── Pro-specific types ───────────────────────────────────────────────────────

/** Appointment as seen from the master's side (incoming client booking) */
export interface ProAppointment {
  id: string;
  client_name: string;
  client_phone: string | null;
  service_name: string;
  service_id: string;
  price: number;
  start_datetime: string;   // ISO UTC
  end_datetime: string;     // ISO UTC
  status: BookingStatus;
  payment_method: 'online' | 'cash' | null;
  created_at: string;
}

export interface ProAppointmentsPage {
  results: ProAppointment[];
  count: number;
  next: string | null;
}

export interface ProAppointmentFilter {
  status?: string;        // comma-separated statuses
  date_from?: string;     // "YYYY-MM-DD"
  date_to?: string;
  page?: number;
  page_size?: number;
}

// ─── Pro mock store ───────────────────────────────────────────────────────────

function proDate(daysFromNow: number, h: number, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export const mockProStore: ProAppointment[] = [
  // Today
  {
    id: 'pa1', client_name: 'Анна К.', client_phone: '+79001234567',
    service_name: 'Маникюр классический', service_id: 's1', price: 1500,
    start_datetime: proDate(0, 14), end_datetime: proDate(0, 15),
    status: 'confirmed', payment_method: 'online', created_at: proDate(-1, 10),
  },
  {
    id: 'pa2', client_name: 'Мария С.', client_phone: null,
    service_name: 'Педикюр', service_id: 's3', price: 2000,
    start_datetime: proDate(0, 16, 30), end_datetime: proDate(0, 17, 30),
    status: 'awaiting_payment', payment_method: null, created_at: proDate(-1, 12),
  },
  // Upcoming
  {
    id: 'pa3', client_name: 'Ольга Д.', client_phone: '+79009876543',
    service_name: 'Маникюр с гель-лаком', service_id: 's2', price: 1800,
    start_datetime: proDate(1, 10), end_datetime: proDate(1, 11, 30),
    status: 'confirmed', payment_method: 'online', created_at: proDate(-2, 9),
  },
  {
    id: 'pa4', client_name: 'Елена В.', client_phone: '+79005554433',
    service_name: 'Наращивание ногтей', service_id: 's4', price: 3000,
    start_datetime: proDate(3, 13), end_datetime: proDate(3, 15),
    status: 'pending', payment_method: null, created_at: proDate(0, 8),
  },
  {
    id: 'pa5', client_name: 'Татьяна Р.', client_phone: null,
    service_name: 'Маникюр классический', service_id: 's1', price: 1500,
    start_datetime: proDate(5, 11), end_datetime: proDate(5, 12),
    status: 'confirmed', payment_method: 'online', created_at: proDate(-1, 18),
  },
  // History
  {
    id: 'pa6', client_name: 'Юлия М.', client_phone: '+79001112233',
    service_name: 'Педикюр', service_id: 's3', price: 1500,
    start_datetime: proDate(-3, 14), end_datetime: proDate(-3, 15, 15),
    status: 'completed', payment_method: 'online', created_at: proDate(-10, 11),
  },
  {
    id: 'pa7', client_name: 'Светлана И.', client_phone: null,
    service_name: 'Маникюр с гель-лаком', service_id: 's2', price: 1800,
    start_datetime: proDate(-7, 12), end_datetime: proDate(-7, 13, 30),
    status: 'cancelled', payment_method: null, created_at: proDate(-14, 10),
  },
  {
    id: 'pa8', client_name: 'Наталья Б.', client_phone: '+79007778899',
    service_name: 'Наращивание ногтей', service_id: 's4', price: 3000,
    start_datetime: proDate(-14, 10), end_datetime: proDate(-14, 12),
    status: 'completed', payment_method: 'online', created_at: proDate(-21, 9),
  },
  {
    id: 'pa9', client_name: 'Валентина С.', client_phone: null,
    service_name: 'Маникюр классический', service_id: 's1', price: 1500,
    start_datetime: proDate(-20, 15), end_datetime: proDate(-20, 16),
    status: 'no_show', payment_method: 'online', created_at: proDate(-27, 14),
  },
];

function mapProResponse(raw: any): ProAppointment {
  return {
    id: raw.appointment?.id ?? raw.id,
    client_name: raw.client?.name ?? raw.client_name ?? 'Клиент',
    client_phone: raw.client?.phone ?? raw.client_phone ?? null,
    service_name: raw.service?.name ?? raw.service_name ?? '',
    service_id: raw.service?.id ?? raw.service_id ?? '',
    price: raw.appointment?.price ?? raw.price ?? 0,
    start_datetime: raw.appointment?.start_datetime ?? raw.start_datetime ?? '',
    end_datetime: raw.appointment?.end_datetime ?? raw.end_datetime ?? '',
    status: raw.appointment?.status ?? raw.status ?? 'pending',
    payment_method: raw.appointment?.payment_method ?? raw.payment_method ?? null,
    created_at: raw.appointment?.created_at ?? raw.created_at ?? '',
  };
}

// ─── Pro API ──────────────────────────────────────────────────────────────────

export const getProAppointments = async (filter: ProAppointmentFilter = {}): Promise<ProAppointmentsPage> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 250));
    let results = [...mockProStore];
    if (filter.status) {
      const statuses = filter.status.split(',');
      results = results.filter(a => statuses.includes(a.status));
    }
    if (filter.date_from) {
      results = results.filter(a => a.start_datetime.split('T')[0] >= filter.date_from!);
    }
    if (filter.date_to) {
      results = results.filter(a => a.start_datetime.split('T')[0] <= filter.date_to!);
    }
    results.sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
    const page = filter.page ?? 1;
    const size = filter.page_size ?? 20;
    const start = (page - 1) * size;
    const paginated = results.slice(start, start + size);
    return { results: paginated, count: results.length, next: start + size < results.length ? 'next' : null };
  }
  const api = getApiClient();
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.date_from) params.set('date_from', filter.date_from);
  if (filter.date_to) params.set('date_to', filter.date_to);
  if (filter.page) params.set('page', String(filter.page));
  if (filter.page_size) params.set('page_size', String(filter.page_size));
  const { data } = await api.get<any>(`/appointments/?${params.toString()}`);
  const raw = Array.isArray(data) ? data : data.results ?? [];
  const count = data.count ?? raw.length;
  const next = data.next ?? null;
  return { results: raw.map(mapProResponse), count, next };
};

export const getProAppointmentById = async (id: string): Promise<ProAppointment> => {
  if (IS_MOCK) {
    const a = mockProStore.find(a => a.id === id);
    if (!a) throw new Error('Appointment not found');
    return { ...a };
  }
  const api = getApiClient();
  const { data } = await api.get<any>(`/appointments/${id}/`);
  return mapProResponse(data);
};

export const completeAppointment = async (id: string): Promise<void> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    const a = mockProStore.find(a => a.id === id);
    if (a) a.status = 'completed';
    return;
  }
  await getApiClient().post(`/appointments/${id}/complete/`);
};

export const cancelAppointmentWithReason = async (id: string, reason: string): Promise<void> => {
  if (IS_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    const a = mockProStore.find(a => a.id === id);
    if (a) a.status = 'cancelled';
    return;
  }
  await getApiClient().post(`/appointments/${id}/cancel/`, { reason });
};
