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
