import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_reminder_1h'
  | 'payment_succeeded'
  | 'review_request';

export interface NotificationPayload {
  type: NotificationType;
  booking_id?: string;
}

// ─── Pure helper (testable without expo-router) ───────────────────────────────

export function getDeepLinkFromNotification(
  data: Record<string, unknown>,
): string | null {
  const type = data.type as NotificationType | undefined;
  if (!type) return null;

  switch (type) {
    case 'booking_created':
    case 'booking_confirmed':
    case 'booking_cancelled':
    case 'booking_reminder_1h':
    case 'payment_succeeded':
      return data.booking_id ? `/booking/${data.booking_id}` : null;
    case 'review_request':
      return data.booking_id ? `/review/${data.booking_id}` : null;
    default:
      return null;
  }
}

// ─── Foreground handler (call at module level in _layout.tsx) ─────────────────

export function configureForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Tap handler (subscribe in useEffect, return cleanup) ─────────────────────

export function addNotificationTapListener(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as Record<
        string,
        unknown
      >;
      const link = getDeepLinkFromNotification(data);
      if (link) router.push(link as any);
    },
  );
  return () => sub.remove();
}
