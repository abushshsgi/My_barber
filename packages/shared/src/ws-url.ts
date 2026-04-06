/** Build WebSocket URL for Django Channels (same host as REST API). */
export function notificationWebSocketUrl(accessToken: string): string {
  const raw =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
      : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const u = new URL(raw);
  const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${u.host}/ws/notifications/?token=${encodeURIComponent(accessToken)}`;
}
