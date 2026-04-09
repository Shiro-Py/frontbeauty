import { Platform } from 'react-native';

import { getApiClient } from './client';
import { IS_MOCK } from './mock';
import { tokenStorage } from '../storage/tokenStorage';

/**
 * Инициализирует анонимную сессию при первом запуске.
 * Если токен уже есть — ничего не делает.
 * После login/register токен удаляется через tokenStorage.clearAnonymous().
 */
export const initAnonymousSession = async (): Promise<void> => {
  const existing = await tokenStorage.getAnonymous();
  if (existing) return;

  if (IS_MOCK) {
    await tokenStorage.saveAnonymous('mock_anonymous_token');
    return;
  }

  try {
    const api = getApiClient();
    const deviceId = await tokenStorage.getDeviceId();
    const { data } = await api.post<{ access_token: string }>('/auth/anonymous', {
      device_id: deviceId,
      platform: Platform.OS,
    });
    await tokenStorage.saveAnonymous(data.access_token);
  } catch {
    // Не критично — приложение работает без анонимного токена
  }
};
