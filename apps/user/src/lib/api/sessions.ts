import { apiJson } from "./client";

export type ApiUserSession = {
  id: number;
  device_name: string;
  platform: string;
  ip_address: string | null;
  last_seen_at: string;
  created_at: string;
  is_current: boolean;
};

export async function fetchUserSessions(): Promise<ApiUserSession[]> {
  return apiJson<ApiUserSession[]>("/api/v1/users/me/sessions/");
}

export async function revokeUserSession(id: number): Promise<void> {
  await apiJson<void>(`/api/v1/users/me/sessions/${id}/`, { method: "DELETE" });
}

export async function revokeOtherSessions(): Promise<{ revoked_count: number }> {
  return apiJson<{ revoked_count: number }>("/api/v1/users/me/sessions/revoke-others/", {
    method: "POST",
  });
}
