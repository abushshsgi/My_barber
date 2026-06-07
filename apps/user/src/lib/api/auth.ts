import { apiJson } from "./client";
import type { ApiUser, PhoneCheckResponse, PhoneSendCodeResponse, PhoneVerifyResponse } from "./types";

export async function checkPhone(phone: string): Promise<PhoneCheckResponse> {
  return apiJson<PhoneCheckResponse>("/api/v1/auth/phone/check/", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
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
