import { getApiClient } from './client';
import { IS_MOCK } from './mock';

// ─── Types ────────────────────────────────────────────────────────────────────

/** 0 = Monday … 6 = Sunday (ISO weekday − 1) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WorkingDay {
  day_of_week: DayOfWeek;
  is_working_day: boolean;
  /** "HH:MM" 24-h, null when is_working_day=false */
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
}

export type Schedule = WorkingDay[];

export interface PatchDayPayload {
  day_of_week: DayOfWeek;
  is_working_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
  break_start?: string | null;
  break_end?: string | null;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function validateWorkingDay(day: WorkingDay): string | null {
  if (!day.is_working_day) return null;

  if (!day.start_time || !day.end_time) {
    return 'Укажите время начала и окончания';
  }

  const start = timeToMinutes(day.start_time);
  const end = timeToMinutes(day.end_time);

  if (end <= start) {
    return 'Время окончания должно быть позже начала';
  }
  if (end - start < 60) {
    return 'Длительность рабочего дня — минимум 1 час';
  }

  if (day.break_start && day.break_end) {
    const bs = timeToMinutes(day.break_start);
    const be = timeToMinutes(day.break_end);
    if (be <= bs) {
      return 'Время начала перерыва должно быть раньше окончания';
    }
    if (bs < start || be > end) {
      return 'Перерыв должен быть внутри рабочих часов';
    }
  } else if (day.break_start && !day.break_end) {
    return 'Укажите время окончания перерыва';
  } else if (!day.break_start && day.break_end) {
    return 'Укажите время начала перерыва';
  }

  return null;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const defaultSchedule: Schedule = [
  { day_of_week: 0, is_working_day: true,  start_time: '10:00', end_time: '20:00', break_start: '14:00', break_end: '15:00' },
  { day_of_week: 1, is_working_day: true,  start_time: '10:00', end_time: '20:00', break_start: null,    break_end: null },
  { day_of_week: 2, is_working_day: false, start_time: null,    end_time: null,    break_start: null,    break_end: null },
  { day_of_week: 3, is_working_day: true,  start_time: '10:00', end_time: '20:00', break_start: null,    break_end: null },
  { day_of_week: 4, is_working_day: true,  start_time: '10:00', end_time: '20:00', break_start: null,    break_end: null },
  { day_of_week: 5, is_working_day: true,  start_time: '12:00', end_time: '18:00', break_start: null,    break_end: null },
  { day_of_week: 6, is_working_day: false, start_time: null,    end_time: null,    break_start: null,    break_end: null },
];

// ─── API ──────────────────────────────────────────────────────────────────────

export const getSchedule = async (): Promise<Schedule> => {
  if (IS_MOCK) return defaultSchedule.map(d => ({ ...d }));
  const { data } = await getApiClient().get<Schedule>('/specialists/me/schedule/');
  // Ensure all 7 days present even if backend returns partial
  const map = new Map(data.map(d => [d.day_of_week, d]));
  return (Array.from({ length: 7 }, (_, i) => i) as DayOfWeek[]).map(
    dow => map.get(dow) ?? { day_of_week: dow, is_working_day: false, start_time: null, end_time: null, break_start: null, break_end: null },
  );
};

export const patchScheduleDay = async (payload: PatchDayPayload): Promise<void> => {
  if (IS_MOCK) return;
  await getApiClient().patch('/specialists/me/schedule/', [payload]);
};

// ─── TimeOff types ────────────────────────────────────────────────────────────

export interface TimeOff {
  id: string;
  start_at: string; // ISO 8601 UTC
  end_at: string;   // ISO 8601 UTC
  reason: string | null;
}

export interface TimeOffCreate {
  start_at: string;
  end_at: string;
  reason?: string | null;
}

// ─── TimeOff validation ───────────────────────────────────────────────────────

export function validateTimeOff(startAt: Date, endAt: Date): string | null {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (startAt < todayStart) {
    return 'Нельзя создать блокировку в прошлом';
  }
  if (endAt <= startAt) {
    return 'Дата окончания должна быть позже начала';
  }
  const diffDays = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 90) {
    return 'Максимальная длительность блокировки — 90 дней';
  }
  return null;
}

// ─── TimeOff mock data ────────────────────────────────────────────────────────

const mockTimeOffs: TimeOff[] = (() => {
  const now = new Date();
  const d = (daysFromNow: number, h = 0, m = 0) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + daysFromNow);
    dt.setHours(h, m, 0, 0);
    return dt.toISOString();
  };
  return [
    { id: 'to1', start_at: d(7),      end_at: d(14, 23, 59), reason: 'Отпуск' },
    { id: 'to2', start_at: d(2, 15),  end_at: d(2, 16),      reason: 'Врач' },
  ];
})();

const mockStore: TimeOff[] = [...mockTimeOffs];

// ─── TimeOff API ──────────────────────────────────────────────────────────────

export const getTimeOffs = async (dateFrom: string, dateTo: string): Promise<TimeOff[]> => {
  if (IS_MOCK) {
    return mockStore
      .filter(t => t.start_at >= dateFrom && t.start_at <= dateTo + 'T23:59:59Z')
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  }
  const { data } = await getApiClient().get<TimeOff[]>(
    `/specialists/me/time-off/?date_from=${dateFrom}&date_to=${dateTo}`,
  );
  return data;
};

export const createTimeOff = async (payload: TimeOffCreate): Promise<TimeOff> => {
  if (IS_MOCK) {
    const entry: TimeOff = { id: String(Date.now()), ...payload, reason: payload.reason ?? null };
    mockStore.push(entry);
    mockStore.sort((a, b) => a.start_at.localeCompare(b.start_at));
    return entry;
  }
  const { data } = await getApiClient().post<TimeOff>('/specialists/me/time-off/', payload);
  return data;
};

export const deleteTimeOff = async (id: string): Promise<void> => {
  if (IS_MOCK) {
    const idx = mockStore.findIndex(t => t.id === id);
    if (idx !== -1) mockStore.splice(idx, 1);
    return;
  }
  await getApiClient().delete(`/specialists/me/time-off/${id}/`);
};
