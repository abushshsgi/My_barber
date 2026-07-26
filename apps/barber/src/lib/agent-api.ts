/** Field agent auth — barber JWT dan alohida. */

import { apiFetch } from "@/lib/api";

const ACCESS_KEY = "mysaloon_agent_access";
const REFRESH_KEY = "mysaloon_agent_refresh";

export function getAgentAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function setAgentTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearAgentTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function agentApiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const access = getAgentAccessToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const res = await apiFetch(path, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : `Xatolik (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export type AgentMe = {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  code: string;
  is_active: boolean;
  invite_url: string;
  stats: {
    barbers_referred: number;
    salons_referred: number;
    salons_trial: number;
    salons_expired: number;
    salons_active: number;
    salons_published: number;
    trial_days: number;
    trial_value_uzs: number;
  };
  created_at: string;
  last_login: string | null;
};

export type AgentSalon = {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  is_published: boolean;
  business_kind: string;
  subscription_status: string;
  trial_ends_at: string | null;
  trial_value_uzs: number;
  created_at: string;
  owner_name: string;
  owner_phone: string;
  members_count: number;
};

export type AgentInvite = {
  code: string;
  invite_url: string;
  qr_image_url: string;
  trial_days: number;
  trial_value_uzs: number;
};
