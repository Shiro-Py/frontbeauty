import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { tokenStorage } from '../storage/tokenStorage';

export type PermissionResult = 'granted' | 'denied' | 'undetermined';

const DECLINED_KEY = 'notifications_declined_at';

export async function requestNotificationPermissions(): Promise<PermissionResult> {
  if (Platform.OS === 'web') return 'denied';

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return 'granted';

  const { status } = await Notifications.requestPermissionsAsync();

  if (status === 'denied') {
    await tokenStorage.setNotificationsDeclinedAt(new Date().toISOString());
  }

  return status as PermissionResult;
}

export async function getNotificationsDeclinedAt(): Promise<string | null> {
  return tokenStorage.getNotificationsDeclinedAt();
}
