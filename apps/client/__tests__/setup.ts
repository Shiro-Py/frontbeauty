import '@testing-library/jest-native/extend-expect';

// ── SecureStore (tokenStorage) ────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => {
    if (key === 'ACCESS_TOKEN') return Promise.resolve('test-access-token');
    if (key === 'REFRESH_TOKEN') return Promise.resolve('test-refresh-token');
    if (key === 'DEVICE_ID') return Promise.resolve('test-device-id');
    return Promise.resolve(null);
  }),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ── AsyncStorage ───────────────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// ── Ionicons (no native SVG in tests) ─────────────────────────────────────────
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// ── expo-notifications ────────────────────────────────────────────────────────
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getDevicePushTokenAsync: jest.fn().mockResolvedValue({ data: 'test-push-token' }),
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
}));

// ── expo-router ───────────────────────────────────────────────────────────────
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: jest.fn(),
  Link: 'Link',
}));

// Silence noise
global.console.log = jest.fn();
global.console.warn = jest.fn();
