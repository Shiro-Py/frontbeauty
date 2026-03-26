import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'ACCESS_TOKEN',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  DEVICE_ID: 'DEVICE_ID',
} as const;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async delete(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const tokenStorage = {
  async getAccess(): Promise<string | null> {
    return storage.get(KEYS.ACCESS_TOKEN);
  },
  async getRefresh(): Promise<string | null> {
    return storage.get(KEYS.REFRESH_TOKEN);
  },
  async save(access: string, refresh: string): Promise<void> {
    await storage.set(KEYS.ACCESS_TOKEN, access);
    await storage.set(KEYS.REFRESH_TOKEN, refresh);
  },
  async getDeviceId(): Promise<string> {
    let id = await storage.get(KEYS.DEVICE_ID);
    if (!id) {
      id = generateUUID();
      await storage.set(KEYS.DEVICE_ID, id);
    }
    return id;
  },
  async clear(): Promise<void> {
    // Только токены сессии. DEVICE_ID не удаляем — он идентифицирует устройство.
    await storage.delete(KEYS.ACCESS_TOKEN);
    await storage.delete(KEYS.REFRESH_TOKEN);
  },
};
