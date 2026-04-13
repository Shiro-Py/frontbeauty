import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getApiClient } from '../api/client';
import { tokenStorage } from '../storage/tokenStorage';

export type AppType = 'client' | 'pro';

// ─── Internal ─────────────────────────────────────────────────────────────────

async function postToken(
  token: string,
  appType: AppType,
  deviceId: string,
): Promise<void> {
  const api = getApiClient();
  await api.post('/auth/device-token/', {
    token,
    platform: Platform.OS as 'ios' | 'android',
    app_type: appType,
    device_id: deviceId,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Registers the FCM/APNs push token with the backend.
 * No-ops if permission not granted or token unchanged.
 * Retries once (after 5 s) on network failure.
 */
export async function registerDevicePushToken(appType: AppType): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getDevicePushTokenAsync()).data;
  const saved = await tokenStorage.getPushToken();
  if (saved === token) return; // already registered with this token

  const deviceId = await tokenStorage.getDeviceId();

  try {
    await postToken(token, appType, deviceId);
    await tokenStorage.savePushToken(token);
  } catch {
    // Retry after 5 seconds
    await new Promise<void>((r) => setTimeout(r, 5000));
    try {
      await postToken(token, appType, deviceId);
      await tokenStorage.savePushToken(token);
    } catch {
      // Silent fail — will retry on next launch
    }
  }
}

/**
 * Subscribes to push token refresh events.
 * Call in useEffect; returned function removes the listener.
 */
export function addPushTokenRefreshListener(appType: AppType): () => void {
  const sub = Notifications.addPushTokenListener(async ({ data: token }) => {
    const deviceId = await tokenStorage.getDeviceId();
    try {
      await postToken(token, appType, deviceId);
      await tokenStorage.savePushToken(token);
    } catch {
      // Silent — system will deliver a new refresh event later
    }
  });
  return () => sub.remove();
}
