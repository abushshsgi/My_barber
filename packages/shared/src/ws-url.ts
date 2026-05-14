import { getPublicApiBase } from "./api";

function apiBaseUrl(): string {
  return getPublicApiBase() || "http://127.0.0.1:8000";
}

/** Build WebSocket URL for Django Channels (same host as REST API). */
export function notificationWebSocketUrl(accessToken: string): string {
  const raw = apiBaseUrl();
  const u = new URL(raw);
  const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${u.host}/ws/notifications/?token=${encodeURIComponent(accessToken)}`;
}

export function chatWebSocketUrl(conversationId: string, accessToken: string): string {
  const raw = apiBaseUrl();
  const u = new URL(raw);
  const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${u.host}/ws/chat/${encodeURIComponent(conversationId)}/?token=${encodeURIComponent(accessToken)}`;
}
