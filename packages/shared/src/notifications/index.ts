export { requestNotificationPermissions, getNotificationsDeclinedAt } from './permissions';
export type { PermissionResult } from './permissions';

export { registerDevicePushToken, addPushTokenRefreshListener } from './registration';
export type { AppType as NotificationAppType } from './registration';

export {
  configureForegroundHandler,
  addNotificationTapListener,
  getDeepLinkFromNotification,
} from './handlers';
export type { NotificationType, NotificationPayload } from './handlers';
