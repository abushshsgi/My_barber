import type { Notification } from "@/lib/mock-data";

type NotificationLinkProps = {
  notification: Notification;
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
};

/** Bildirishnomadan to'g'ri sahifaga deep link. */
export function getNotificationLinkProps(n: Notification): {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
} {
  if (n.bookingId) {
    return { to: "/bookings", search: { focus: n.bookingId } };
  }
  if (n.chatId) {
    return { to: "/chat/$id", params: { id: n.chatId } };
  }
  if (n.reviewId) {
    return { to: "/reviews", search: { focus: n.reviewId } };
  }
  if (n.link) {
    return { to: n.link };
  }
  return { to: "/notifications" };
}

export type { NotificationLinkProps };
