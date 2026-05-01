function apiBaseUrl(): string {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return (
    viteEnv?.VITE_API_URL ||
    viteEnv?.NEXT_PUBLIC_API_URL ||
    (typeof process !== "undefined" ? process.env?.VITE_API_URL : undefined) ||
    (typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_API_URL : undefined) ||
    "http://127.0.0.1:8000"
  );
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
