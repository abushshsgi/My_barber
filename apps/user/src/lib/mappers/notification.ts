import type { ApiNotification } from "@/lib/api/types";
import type { Notification } from "@/lib/mock-data";

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daq`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat`;
  return `${Math.floor(hours / 24)} kun`;
}

function mapType(t: string): Notification["type"] {
  if (t === "chat_message" || t === "CHAT") return "chat_message";
  if (
    t === "review" ||
    t === "REVIEW" ||
    t === "review_created" ||
    t === "review_reply"
  ) {
    return "review";
  }
  if (
    t === "promo" ||
    t === "PROMO" ||
    t === "barber_announcement" ||
    t === "salon_invite" ||
    t === "salon_approved"
  ) {
    return "promo";
  }
  return "booking";
}

export function mapNotification(api: ApiNotification): Notification {
  const payload = api.payload ?? {};
  return {
    id: String(api.id),
    type: mapType(api.type),
    title: api.title,
    body: api.body,
    time: formatRelativeTime(api.created_at),
    read: Boolean(api.read_at),
    bookingId: payload.booking_id != null ? String(payload.booking_id) : undefined,
    chatId: payload.conversation_id != null ? String(payload.conversation_id) : undefined,
    reviewId: payload.review_id != null ? String(payload.review_id) : undefined,
    link: typeof payload.link === "string" ? payload.link : undefined,
  };
}
