import { mockProStore, ProAppointment, BookingStatus } from '@beautygo/shared';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── Helpers (mirror logic from screens) ──────────────────────────────────────

const TERMINAL: BookingStatus[] = ['completed', 'cancelled', 'no_show'];

function canComplete(appt: ProAppointment, now = new Date()): boolean {
  if (appt.status !== 'confirmed' && appt.status !== 'in_progress') return false;
  return new Date(appt.end_datetime) <= now;
}

function canCancel(appt: ProAppointment): boolean {
  return !TERMINAL.includes(appt.status);
}

function groupByDate(items: ProAppointment[]): Record<string, ProAppointment[]> {
  const map: Record<string, ProAppointment[]> = {};
  for (const a of items) {
    const key = a.start_datetime.split('T')[0];
    if (!map[key]) map[key] = [];
    map[key].push(a);
  }
  return map;
}

function filterByStatus(items: ProAppointment[], statuses: string[]): ProAppointment[] {
  return items.filter(a => statuses.includes(a.status));
}

function filterByDateRange(items: ProAppointment[], from: string, to: string): ProAppointment[] {
  return items.filter(a => {
    const d = a.start_datetime.split('T')[0];
    return d >= from && d <= to;
  });
}

function makeAppt(overrides: Partial<ProAppointment> = {}): ProAppointment {
  const now = new Date();
  const future = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();
  const past   = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  return {
    id: 'test',
    client_name: 'Тест',
    client_phone: null,
    service_name: 'Маникюр',
    service_id: 's1',
    price: 1500,
    start_datetime: past,
    end_datetime: past,
    status: 'confirmed',
    payment_method: 'online',
    created_at: past,
    ...overrides,
  };
}

// ─── canComplete ──────────────────────────────────────────────────────────────

describe('canComplete', () => {
  const pastEnd   = new Date(Date.now() - 3600 * 1000).toISOString();
  const futureEnd = new Date(Date.now() + 3600 * 1000).toISOString();

  it('returns true for confirmed + past end_datetime', () => {
    expect(canComplete(makeAppt({ status: 'confirmed', end_datetime: pastEnd }))).toBe(true);
  });
  it('returns true for in_progress + past end_datetime', () => {
    expect(canComplete(makeAppt({ status: 'in_progress', end_datetime: pastEnd }))).toBe(true);
  });
  it('returns false for confirmed + future end_datetime', () => {
    expect(canComplete(makeAppt({ status: 'confirmed', end_datetime: futureEnd }))).toBe(false);
  });
  it('returns false for pending (wrong status)', () => {
    expect(canComplete(makeAppt({ status: 'pending', end_datetime: pastEnd }))).toBe(false);
  });
  it('returns false for already completed', () => {
    expect(canComplete(makeAppt({ status: 'completed', end_datetime: pastEnd }))).toBe(false);
  });
  it('returns false for cancelled', () => {
    expect(canComplete(makeAppt({ status: 'cancelled', end_datetime: pastEnd }))).toBe(false);
  });
});

// ─── canCancel ────────────────────────────────────────────────────────────────

describe('canCancel', () => {
  it('returns true for pending', () => expect(canCancel(makeAppt({ status: 'pending' }))).toBe(true));
  it('returns true for awaiting_payment', () => expect(canCancel(makeAppt({ status: 'awaiting_payment' }))).toBe(true));
  it('returns true for confirmed', () => expect(canCancel(makeAppt({ status: 'confirmed' }))).toBe(true));
  it('returns true for in_progress', () => expect(canCancel(makeAppt({ status: 'in_progress' }))).toBe(true));
  it('returns false for completed', () => expect(canCancel(makeAppt({ status: 'completed' }))).toBe(false));
  it('returns false for cancelled', () => expect(canCancel(makeAppt({ status: 'cancelled' }))).toBe(false));
  it('returns false for no_show', () => expect(canCancel(makeAppt({ status: 'no_show' }))).toBe(false));
});

// ─── filterByStatus ───────────────────────────────────────────────────────────

describe('filterByStatus', () => {
  const items: ProAppointment[] = [
    makeAppt({ id: '1', status: 'pending' }),
    makeAppt({ id: '2', status: 'confirmed' }),
    makeAppt({ id: '3', status: 'completed' }),
    makeAppt({ id: '4', status: 'cancelled' }),
  ];

  it('filters upcoming statuses correctly', () => {
    const result = filterByStatus(items, ['pending', 'awaiting_payment', 'confirmed', 'in_progress']);
    expect(result.map(a => a.id)).toEqual(['1', '2']);
  });
  it('filters history statuses correctly', () => {
    const result = filterByStatus(items, ['completed', 'cancelled', 'no_show']);
    expect(result.map(a => a.id)).toEqual(['3', '4']);
  });
  it('returns empty when no match', () => {
    expect(filterByStatus(items, ['no_show'])).toHaveLength(0);
  });
});

// ─── groupByDate ──────────────────────────────────────────────────────────────

describe('groupByDate', () => {
  it('groups appointments by date key', () => {
    const items: ProAppointment[] = [
      makeAppt({ id: '1', start_datetime: '2026-04-15T10:00:00.000Z' }),
      makeAppt({ id: '2', start_datetime: '2026-04-15T14:00:00.000Z' }),
      makeAppt({ id: '3', start_datetime: '2026-04-16T09:00:00.000Z' }),
    ];
    const groups = groupByDate(items);
    expect(Object.keys(groups)).toHaveLength(2);
    expect(groups['2026-04-15']).toHaveLength(2);
    expect(groups['2026-04-16']).toHaveLength(1);
  });

  it('returns empty object for empty input', () => {
    expect(groupByDate([])).toEqual({});
  });
});

// ─── filterByDateRange ────────────────────────────────────────────────────────

describe('filterByDateRange', () => {
  const items: ProAppointment[] = [
    makeAppt({ id: '1', start_datetime: '2026-04-14T10:00:00.000Z' }),
    makeAppt({ id: '2', start_datetime: '2026-04-15T10:00:00.000Z' }),
    makeAppt({ id: '3', start_datetime: '2026-04-16T10:00:00.000Z' }),
    makeAppt({ id: '4', start_datetime: '2026-04-20T10:00:00.000Z' }),
  ];

  it('returns items within date range', () => {
    const result = filterByDateRange(items, '2026-04-15', '2026-04-16');
    expect(result.map(a => a.id)).toEqual(['2', '3']);
  });
  it('returns empty when range excludes all', () => {
    expect(filterByDateRange(items, '2026-05-01', '2026-05-07')).toHaveLength(0);
  });
  it('returns single day correctly', () => {
    expect(filterByDateRange(items, '2026-04-20', '2026-04-20')).toHaveLength(1);
  });
});

// ─── Mock store sanity ────────────────────────────────────────────────────────

describe('mockProStore', () => {
  it('has 9 entries', () => expect(mockProStore).toHaveLength(9));
  it('contains today entries', () => {
    const todayEntries = mockProStore.filter(a => a.id === 'pa1' || a.id === 'pa2');
    expect(todayEntries).toHaveLength(2);
  });
  it('all entries have required fields', () => {
    for (const a of mockProStore) {
      expect(a.id).toBeTruthy();
      expect(a.client_name).toBeTruthy();
      expect(a.service_name).toBeTruthy();
      expect(a.start_datetime).toBeTruthy();
      expect(a.end_datetime).toBeTruthy();
    }
  });
});
