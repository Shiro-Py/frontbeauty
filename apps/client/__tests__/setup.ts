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

// Silence noise
global.console.log = jest.fn();
global.console.warn = jest.fn();
