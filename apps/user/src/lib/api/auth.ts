import { apiJson } from "./client";
import type { PhoneSendCodeResponse, PhoneVerifyResponse } from "./types";

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
