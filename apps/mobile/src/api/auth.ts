import { Platform } from "react-native";
import { apiJson } from "./client";
import { API_BASE, API_ORIGIN, getExtraGoogleClientId } from "./config";
import type { ApiUser } from "./user";

export type AuthSuccess = {
  access: string;
  refresh: string;
  is_new_user?: boolean;
  session_id?: number;
  user: ApiUser;
};

export type PhoneSendCodeResponse = {
  detail: string;
  phone: string;
  registered?: boolean;
  delivery?: string;
  resend_after?: number;
  debug_code?: string;
};

function clientMeta() {
  return {
    client_kind: Platform.OS === "web" ? "web" : "expo",
    app_version: "1.0.0",
    device_name: `MySaloon App (${Platform.OS})`,
  };
}

export async function loginWithGoogle(
  idToken: string,
  referralCode?: string,
): Promise<AuthSuccess> {
  return apiJson<AuthSuccess>("/api/v1/auth/google/", {
    method: "POST",
    body: JSON.stringify({
      id_token: idToken,
      ...(referralCode?.trim() ? { referral_code: referralCode.trim().toUpperCase() } : {}),
      ...clientMeta(),
    }),
  });
}

export async function checkPhone(phone: string): Promise<{
  phone: string;
  has_password: boolean;
  registered: boolean;
}> {
  // Network/5xx ni yutib yubormaymiz — LoginScreen catch da ko‘rsatiladi.
  // Aks holda offline bo‘lsa ham “yangi user” kabi kod yuborishga o‘tib ketardi.
  return apiJson("/api/v1/auth/phone/check/", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function sendPhoneCode(
  phone: string,
  intent: "login" | "register" = "login",
): Promise<PhoneSendCodeResponse> {
  return apiJson("/api/v1/auth/phone/send-code/", {
    method: "POST",
    body: JSON.stringify({ phone, intent }),
  });
}

export async function verifyPhoneCode(
  phone: string,
  code: string,
  intent: "login" | "register" = "login",
  referralCode?: string,
): Promise<AuthSuccess> {
  return apiJson("/api/v1/auth/phone/verify/", {
    method: "POST",
    body: JSON.stringify({
      phone,
      code,
      intent,
      ...(referralCode?.trim() ? { referral_code: referralCode.trim().toUpperCase() } : {}),
      ...clientMeta(),
    }),
  });
}

export async function loginWithPassword(
  phone: string,
  password: string,
): Promise<AuthSuccess> {
  return apiJson("/api/v1/auth/phone/password-login/", {
    method: "POST",
    body: JSON.stringify({ phone, password, ...clientMeta() }),
  });
}

export async function setPassword(password: string): Promise<{ detail: string; user: ApiUser }> {
  return apiJson("/api/v1/auth/phone/set-password/", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<{ detail: string; user: ApiUser }> {
  return apiJson("/api/v1/auth/phone/change-password/", {
    method: "POST",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

/** Refresh — circular importdan qochish uchun raw fetch. */
export async function refreshAccessToken(refresh: string): Promise<{
  access: string;
  refresh?: string;
}> {
  const base = API_BASE || API_ORIGIN;
  const res = await fetch(`${base}/api/v1/auth/token/refresh/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  return (await res.json()) as { access: string; refresh?: string };
}

export function getGoogleClientId(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
  return fromEnv || getExtraGoogleClientId();
}

/**
 * Web OAuth client ID (client_type 3) — native Google Sign-In da idToken uchun kerak.
 * Android client ID Cloud Console da package+SHA-1 bilan qoladi (google-services.json).
 */
export function getGoogleWebClientId(): string {
  return getGoogleClientId();
}

export function normalizeUzPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("998")) return digits.slice(3, 12);
  return digits.slice(0, 9);
}

export function formatUzPhoneDisplay(nine: string): string {
  const d = normalizeUzPhone(nine);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}
