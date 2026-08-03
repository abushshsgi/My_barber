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
    return { to: "/bookings/$bookingId", params: { bookingId: n.bookingId } };
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

/**
 * FCM / deep-link payload dan path string.
 * booking_id, chat_id, review_id, link, path kalitlarini qo'llab-quvvatlaydi.
 */
export function resolveNotificationDeepLink(
  data: Record<string, unknown> | undefined | null,
): string | null {
  if (!data) return null;

  const str = (key: string) => {
    const v = data[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const bookingId = str("booking_id") ?? str("bookingId");
  if (bookingId) return `/bookings/${bookingId}`;

  const chatId = str("chat_id") ?? str("chatId") ?? str("conversation_id");
  if (chatId) return `/chat/${chatId}`;

  const reviewId = str("review_id") ?? str("reviewId");
  if (reviewId) return `/reviews?focus=${encodeURIComponent(reviewId)}`;

  const salonId = str("salon_id") ?? str("salonId");
  if (salonId) return `/salon/${salonId}`;

  const path = str("path") ?? str("link") ?? str("url");
  if (path) {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      try {
        const u = new URL(path);
        return `${u.pathname}${u.search}${u.hash}` || "/";
      } catch {
        return null;
      }
    }
    return path.startsWith("/") ? path : `/${path}`;
  }

  return null;
}

export type { NotificationLinkProps };
