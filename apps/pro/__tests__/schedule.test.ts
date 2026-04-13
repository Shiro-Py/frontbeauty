import { validateWorkingDay, timeToMinutes } from '@beautygo/shared';
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
