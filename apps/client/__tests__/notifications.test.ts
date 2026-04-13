import { getDeepLinkFromNotification } from '@beautygo/shared';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args: any[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: any[]) => mockRequestPermissionsAsync(...args),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  getDevicePushTokenAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
}));

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── requestNotificationPermissions ──────────────────────────────────────────

describe('requestNotificationPermissions', () => {
  let requestNotificationPermissions: typeof import('@beautygo/shared').requestNotificationPermissions;

  beforeEach(async () => {
    jest.resetModules();
    jest.mock('expo-notifications', () => ({
      getPermissionsAsync: (...args: any[]) => mockGetPermissionsAsync(...args),
      requestPermissionsAsync: (...args: any[]) => mockRequestPermissionsAsync(...args),
      setNotificationHandler: jest.fn(),
      addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
      addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
      getDevicePushTokenAsync: jest.fn(),
      setBadgeCountAsync: jest.fn(),
    }));
    ({ requestNotificationPermissions } = await import('@beautygo/shared'));
  });

  it('returns granted immediately if already granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    const result = await requestNotificationPermissions();
    expect(result).toBe('granted');
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permission and returns granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    const result = await requestNotificationPermissions();
    expect(result).toBe('granted');
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('requests permission and returns denied', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const result = await requestNotificationPermissions();
    expect(result).toBe('denied');
  });

  it('returns denied on web platform', async () => {
    jest.mock('react-native', () => ({
      Platform: { OS: 'web' },
    }));
    ({ requestNotificationPermissions } = await import('@beautygo/shared'));
    const result = await requestNotificationPermissions();
    expect(result).toBe('denied');
  });
});

// ─── getDeepLinkFromNotification ──────────────────────────────────────────────

describe('getDeepLinkFromNotification', () => {
  it('routes booking_created → /booking/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'booking_created', booking_id: 'b1' }))
      .toBe('/booking/b1');
  });

  it('routes booking_confirmed → /booking/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'booking_confirmed', booking_id: 'b2' }))
      .toBe('/booking/b2');
  });

  it('routes booking_cancelled → /booking/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'booking_cancelled', booking_id: 'b3' }))
      .toBe('/booking/b3');
  });

  it('routes booking_reminder_1h → /booking/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'booking_reminder_1h', booking_id: 'b4' }))
      .toBe('/booking/b4');
  });

  it('routes payment_succeeded → /booking/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'payment_succeeded', booking_id: 'b5' }))
      .toBe('/booking/b5');
  });

  it('routes review_request → /review/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'review_request', booking_id: 'b6' }))
      .toBe('/review/b6');
  });

  it('returns null for unknown type', () => {
    expect(getDeepLinkFromNotification({ type: 'unknown_type', booking_id: 'b7' }))
      .toBeNull();
  });

  it('returns null when type is missing', () => {
    expect(getDeepLinkFromNotification({ booking_id: 'b8' })).toBeNull();
  });

  it('returns null when booking_id is missing', () => {
    expect(getDeepLinkFromNotification({ type: 'booking_created' })).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(getDeepLinkFromNotification({})).toBeNull();
  });
});
