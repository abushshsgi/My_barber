import { apiFetch, apiJson } from "./client";
import type { ApiUser, PhoneCheckResponse, PhoneSendCodeResponse, PhoneVerifyResponse } from "./types";

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

export async function sendPhoneCode(phone: string): Promise<PhoneSendCodeResponse> {
  return apiJson<PhoneSendCodeResponse>("/api/v1/auth/phone/send-code/", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyPhoneCode(
  phone: string,
  code: string,
): Promise<PhoneVerifyResponse> {
  return apiJson<PhoneVerifyResponse>("/api/v1/auth/phone/verify/", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export async function loginWithPassword(
  phone: string,
  password: string,
): Promise<PhoneVerifyResponse> {
  return apiJson<PhoneVerifyResponse>("/api/v1/auth/phone/password-login/", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
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
