import { getPublicApiBase } from "./api";

function readEnv(name: string): string | undefined {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return (
    viteEnv?.[name] ||
    (typeof process !== "undefined" ? process.env?.[name] : undefined)
  );
}

/** REST same-origin bo‘lsa ham WebSocket to‘g‘ridan-to‘g‘ri API domeniga ulanadi. */
function apiBaseUrl(): string {
  const configured = getPublicApiBase().trim();
  if (configured) return configured;
  if (import.meta.env.DEV) return "http://127.0.0.1:8000";
  const wsOverride = readEnv("VITE_WS_API_URL") || readEnv("NEXT_PUBLIC_WS_API_URL");
  if (wsOverride?.trim()) return wsOverride.trim();
  return "https://api.mysaloon.uz";
}

/** REST bilan bir xil API bazasidan chat WS URL — barber-web REST `API_BASE` dan kelishi kerak. */
export function buildChatWebSocketUrl(
  apiBase: string,
  conversationId: string,
  accessToken: string,
): string {
  const raw = apiBase.trim() || "http://127.0.0.1:8000";
  const u = new URL(raw);
  const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${u.host}/ws/chat/${encodeURIComponent(conversationId)}/?token=${encodeURIComponent(accessToken)}`;
}

/** Build WebSocket URL for Django Channels (same host as REST API). */
export function notificationWebSocketUrl(accessToken: string): string {
  const raw = apiBaseUrl();
  const u = new URL(raw);
  const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${u.host}/ws/notifications/?token=${encodeURIComponent(accessToken)}`;
}

export function chatWebSocketUrl(conversationId: string, accessToken: string): string {
  return buildChatWebSocketUrl(getPublicApiBase(), conversationId, accessToken);
}
