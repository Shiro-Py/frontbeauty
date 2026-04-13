import { validateWorkingDay, timeToMinutes, validateTimeOff } from '@beautygo/shared';
import type { WorkingDay } from '@beautygo/shared';

// ─── timeToMinutes ────────────────────────────────────────────────────────────

describe('timeToMinutes', () => {
  it('converts 00:00 to 0', () => expect(timeToMinutes('00:00')).toBe(0));
  it('converts 10:00 to 600', () => expect(timeToMinutes('10:00')).toBe(600));
  it('converts 10:30 to 630', () => expect(timeToMinutes('10:30')).toBe(630));
  it('converts 23:30 to 1410', () => expect(timeToMinutes('23:30')).toBe(1410));
});

// ─── validateWorkingDay ───────────────────────────────────────────────────────

function makeDay(overrides: Partial<WorkingDay> = {}): WorkingDay {
  return {
    day_of_week: 0,
    is_working_day: true,
    start_time: '10:00',
    end_time: '20:00',
    break_start: null,
    break_end: null,
    ...overrides,
  };
}

describe('validateWorkingDay', () => {
  // Day off — always valid
  it('passes when day is a day off', () => {
    expect(validateWorkingDay(makeDay({ is_working_day: false, start_time: null, end_time: null }))).toBeNull();
  });

  // Missing times
  it('fails when start_time is missing', () => {
    expect(validateWorkingDay(makeDay({ start_time: null }))).toBeTruthy();
  });
  it('fails when end_time is missing', () => {
    expect(validateWorkingDay(makeDay({ end_time: null }))).toBeTruthy();
  });

  // end <= start
  it('fails when end_time equals start_time', () => {
    expect(validateWorkingDay(makeDay({ start_time: '10:00', end_time: '10:00' }))).toMatch(/позже/i);
  });
  it('fails when end_time is before start_time', () => {
    expect(validateWorkingDay(makeDay({ start_time: '14:00', end_time: '10:00' }))).toMatch(/позже/i);
  });

  // Min duration 1h
  it('fails when work duration is less than 1 hour', () => {
    expect(validateWorkingDay(makeDay({ start_time: '10:00', end_time: '10:30' }))).toMatch(/1 час/i);
  });
  it('passes when work duration is exactly 1 hour', () => {
    expect(validateWorkingDay(makeDay({ start_time: '10:00', end_time: '11:00' }))).toBeNull();
  });

  // Break validation
  it('fails when break_end <= break_start', () => {
    const day = makeDay({ break_start: '14:00', break_end: '13:00' });
    expect(validateWorkingDay(day)).toMatch(/раньше/i);
  });
  it('fails when break_start equals break_end', () => {
    const day = makeDay({ break_start: '14:00', break_end: '14:00' });
    expect(validateWorkingDay(day)).toMatch(/раньше/i);
  });
  it('fails when break starts before working hours', () => {
    const day = makeDay({ start_time: '10:00', end_time: '20:00', break_start: '09:00', break_end: '10:30' });
    expect(validateWorkingDay(day)).toMatch(/внутри/i);
  });
  it('fails when break ends after working hours', () => {
    const day = makeDay({ start_time: '10:00', end_time: '18:00', break_start: '17:00', break_end: '19:00' });
    expect(validateWorkingDay(day)).toMatch(/внутри/i);
  });
  it('passes with a valid break inside working hours', () => {
    const day = makeDay({ start_time: '10:00', end_time: '20:00', break_start: '14:00', break_end: '15:00' });
    expect(validateWorkingDay(day)).toBeNull();
  });

  // Missing half of break
  it('fails when only break_start is provided', () => {
    const day = makeDay({ break_start: '14:00', break_end: null });
    expect(validateWorkingDay(day)).toMatch(/окончани/i);
  });
  it('fails when only break_end is provided', () => {
    const day = makeDay({ break_start: null, break_end: '15:00' });
    expect(validateWorkingDay(day)).toMatch(/начал/i);
  });

  // Happy path
  it('passes a normal full working day without break', () => {
    expect(validateWorkingDay(makeDay())).toBeNull();
  });
  it('passes Monday 10:00–20:00 with break 14:00–15:00', () => {
    const day = makeDay({ start_time: '10:00', end_time: '20:00', break_start: '14:00', break_end: '15:00' });
    expect(validateWorkingDay(day)).toBeNull();
  });
});

// ─── validateTimeOff ──────────────────────────────────────────────────────────

describe('validateTimeOff', () => {
  function future(daysFromNow: number, h = 10, m = 0): Date {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(h, m, 0, 0);
    return d;
  }
  function past(daysAgo: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  it('fails when startAt is in the past', () => {
    expect(validateTimeOff(past(1), future(1))).toMatch(/прошлом/i);
  });
  it('fails when startAt is today but earlier in the day (still past midnight start)', () => {
    const yesterday = past(0); // midnight today — should pass
    const startYesterday = past(1);
    expect(validateTimeOff(startYesterday, future(1))).toMatch(/прошлом/i);
  });
  it('passes when startAt is exactly today midnight', () => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    expect(validateTimeOff(todayMidnight, future(1))).toBeNull();
  });

  it('fails when endAt equals startAt', () => {
    const d = future(1);
    expect(validateTimeOff(d, d)).toMatch(/позже/i);
  });
  it('fails when endAt is before startAt', () => {
    expect(validateTimeOff(future(3), future(1))).toMatch(/позже/i);
  });

  it('fails when duration exceeds 90 days', () => {
    expect(validateTimeOff(future(1), future(92))).toMatch(/90 дней/i);
  });
  it('passes when duration is exactly 90 days', () => {
    expect(validateTimeOff(future(1), future(91))).toBeNull();
  });

  it('passes a normal all-day single-day block', () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 0, 0);
    expect(validateTimeOff(start, end)).toBeNull();
  });
  it('passes a normal vacation block (7 days)', () => {
    expect(validateTimeOff(future(1, 0), future(8, 23, 59))).toBeNull();
  });
  it('passes a 1-hour block today', () => {
    expect(validateTimeOff(future(0, 15), future(0, 16))).toBeNull();
  });
});
