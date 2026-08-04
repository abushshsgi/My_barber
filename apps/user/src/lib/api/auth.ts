import { getStashedBarberInviteCode, getStashedReferralCode } from "@/lib/referral-storage";
import { getAuthClientMeta } from "@/lib/client-meta";
import { apiFetch, apiJson } from "./client";
import type {
  ApiUser,
  PhoneAuthIntent,
  PhoneCheckResponse,
  PhoneSendCodeResponse,
  PhoneVerifyResponse,
} from "./types";

export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export class AuthRateLimitError extends Error {
  retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "AuthRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class SendCodeError extends AuthRateLimitError {
  constructor(message: string, retryAfter: number) {
    super(message, retryAfter);
    this.name = "SendCodeError";
  }
}

function readRetryAfter(body: unknown, fallback = OTP_RESEND_COOLDOWN_SECONDS): number {
  if (!body || typeof body !== "object") return fallback;
  const value = (body as { retry_after?: unknown }).retry_after;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.ceil(value);
  }
  return fallback;
}

export async function checkPhone(phone: string): Promise<PhoneCheckResponse> {
  const res = await apiFetch("/api/v1/auth/phone/check/", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  // Eski production API da /check/ yo'q — OTP oqimiga o'tish.
  if (res.status === 404) {
    return { phone, has_password: false, registered: false };
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : res.statusText || "Xatolik";
    throw new Error(detail);
  }
  return body as PhoneCheckResponse;
}

export async function sendPhoneCode(
  phone: string,
  intent: PhoneAuthIntent = "login",
): Promise<PhoneSendCodeResponse> {
  const res = await apiFetch("/api/v1/auth/phone/send-code/", {
    method: "POST",
    body: JSON.stringify({ phone, intent }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : res.statusText || "Xatolik";
    if (res.status === 429) {
      throw new SendCodeError(detail, readRetryAfter(body));
    }
    throw new Error(detail);
  }
  if (body == null || typeof body !== "object") {
    throw new Error("Server noto'g'ri javob qaytardi. Sahifani yangilab qayta urinib ko'ring.");
  }
  return body as PhoneSendCodeResponse;
}

export async function verifyPhoneCode(
  phone: string,
  code: string,
  intent: PhoneAuthIntent = "login",
): Promise<PhoneVerifyResponse> {
  const referralCode = getStashedReferralCode();
  const barberInviteCode = getStashedBarberInviteCode();
  return apiJson<PhoneVerifyResponse>("/api/v1/auth/phone/verify/", {
    method: "POST",
    body: JSON.stringify({
      phone,
      code,
      intent,
      ...getAuthClientMeta(),
      ...(referralCode ? { referral_code: referralCode } : {}),
      ...(barberInviteCode ? { barber_invite_code: barberInviteCode } : {}),
    }),
  });
}

export async function loginWithPassword(
  phone: string,
  password: string,
): Promise<PhoneVerifyResponse> {
  const res = await apiFetch("/api/v1/auth/phone/password-login/", {
    method: "POST",
    body: JSON.stringify({ phone, password, ...getAuthClientMeta() }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : res.statusText || "Xatolik";
    if (res.status === 429) {
      throw new AuthRateLimitError(detail, readRetryAfter(body, 900));
    }
    throw new Error(detail);
  }
  if (body == null || typeof body !== "object") {
    throw new Error("Server noto'g'ri javob qaytardi. Sahifani yangilab qayta urinib ko'ring.");
  }
  return body as PhoneVerifyResponse;
}

export async function loginWithGoogle(idToken: string): Promise<PhoneVerifyResponse> {
  const referralCode = getStashedReferralCode();
  const barberInviteCode = getStashedBarberInviteCode();
  const res = await apiFetch("/api/v1/auth/google/", {
    method: "POST",
    body: JSON.stringify({
      id_token: idToken,
      ...getAuthClientMeta(),
      ...(referralCode ? { referral_code: referralCode } : {}),
      ...(barberInviteCode ? { barber_invite_code: barberInviteCode } : {}),
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : res.statusText || "Xatolik";
    throw new Error(detail);
  }
  if (body == null || typeof body !== "object") {
    throw new Error("Server noto'g'ri javob qaytardi. Sahifani yangilab qayta urinib ko'ring.");
  }
  return body as PhoneVerifyResponse;
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
