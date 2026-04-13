import { getDeepLinkFromNotification, requestNotificationPermissions } from '@beautygo/shared';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockSetItemAsync = jest.fn().mockResolvedValue(undefined);

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
  setItemAsync: (...args: any[]) => mockSetItemAsync(...args),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── requestNotificationPermissions ──────────────────────────────────────────

describe('requestNotificationPermissions (Pro)', () => {
  beforeEach(() => {
    mockGetPermissionsAsync.mockReset();
    mockRequestPermissionsAsync.mockReset();
    mockSetItemAsync.mockReset();
    mockSetItemAsync.mockResolvedValue(undefined);
  });

  it('returns granted immediately if already granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    expect(await requestNotificationPermissions()).toBe('granted');
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests and returns granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    expect(await requestNotificationPermissions()).toBe('granted');
  });

  it('requests and returns denied', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    expect(await requestNotificationPermissions()).toBe('denied');
  });

  it('saves declined_at when denied', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await requestNotificationPermissions();
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      'NOTIFICATIONS_DECLINED_AT',
      expect.any(String),
    );
  });
});

// ─── getDeepLinkFromNotification ──────────────────────────────────────────────

describe('getDeepLinkFromNotification (Pro)', () => {
  it('booking_created → /booking/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'booking_created', booking_id: 'pa1' }))
      .toBe('/booking/pa1');
  });
  it('booking_confirmed → /booking/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'booking_confirmed', booking_id: 'pa2' }))
      .toBe('/booking/pa2');
  });
  it('booking_cancelled → /booking/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'booking_cancelled', booking_id: 'pa3' }))
      .toBe('/booking/pa3');
  });
  it('booking_reminder_1h → /booking/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'booking_reminder_1h', booking_id: 'pa4' }))
      .toBe('/booking/pa4');
  });
  it('payment_succeeded → /booking/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'payment_succeeded', booking_id: 'pa5' }))
      .toBe('/booking/pa5');
  });
  it('review_request → /review/:id', () => {
    expect(getDeepLinkFromNotification({ type: 'review_request', booking_id: 'pa6' }))
      .toBe('/review/pa6');
  });
  it('unknown type → null', () => {
    expect(getDeepLinkFromNotification({ type: 'push_marketing', booking_id: 'x' }))
      .toBeNull();
  });
  it('missing booking_id → null', () => {
    expect(getDeepLinkFromNotification({ type: 'booking_created' })).toBeNull();
  });
  it('empty payload → null', () => {
    expect(getDeepLinkFromNotification({})).toBeNull();
  });
});
