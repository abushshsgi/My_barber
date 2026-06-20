import { apiFetch, apiJson } from "./client";
import type { ApiUser } from "./types";

export const EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 60;

export type EmailSendCodeResponse = {
  detail: string;
  email: string;
  resend_after?: number;
  delivery?: "email" | "app";
  debug_code?: string;
  email_error?: string;
};

export type EmailVerifyResponse = {
  detail: string;
  user: ApiUser;
};

export async function sendEmailVerificationCode(email: string): Promise<EmailSendCodeResponse> {
  const res = await apiFetch("/api/v1/users/me/email/send-code/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : res.statusText || "Xatolik";
    throw new Error(detail);
  }
  return body as EmailSendCodeResponse;
}

export async function verifyEmailCode(code: string): Promise<EmailVerifyResponse> {
  return apiJson<EmailVerifyResponse>("/api/v1/users/me/email/verify/", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function verifyEmailLink(token: string): Promise<EmailVerifyResponse> {
  return apiJson<EmailVerifyResponse>(
    `/api/v1/auth/email/verify-link/?token=${encodeURIComponent(token)}`,
  );
}
