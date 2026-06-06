import type { ApiConversation, ApiMessage } from "@/lib/api/types";
import type { ChatMessage, ChatThread } from "@/lib/mock-data";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daq`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "kecha";
  return `${days} kun`;
}

export function mapConversation(api: ApiConversation): ChatThread {
  return {
    id: api.id,
    salonName: api.other.full_name,
    barberName: api.other.full_name,
    avatarSeed: String(api.other.id),
    avatarUrl: api.other.avatar || undefined,
    lastMessage: api.last_message_text || "",
    lastTime: formatRelativeTime(api.last_message_at ?? api.updated_at),
    unread: 0,
  };
}

export function mapMessage(api: ApiMessage, myKind: "USER" | "BARBER" = "USER"): ChatMessage {
  return {
    id: String(api.id),
    fromMe: api.sender_kind === myKind,
    text: api.text,
    time: new Date(api.created_at).toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
