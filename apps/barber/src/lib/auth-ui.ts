export type SignupFlow = "owner" | "employee" | "mybarber" | "independent";

export type SignupIdentity = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  flow: SignupFlow;
};

export {
  formatApiErrorBody as formatApiError,
  formatFetchError,
  formatHttpApiError,
  parseResponseBody as parseJsonSafe,
} from "@/lib/http-errors";

import {
  formatApiErrorBody,
  formatHttpApiError,
} from "@/lib/http-errors";

export function extractApiError(
  body: unknown,
  fallback: string,
  res?: Response,
): string {
  if (res) return formatHttpApiError(res, body, fallback);
  return formatApiErrorBody(body, fallback);
}

function looksLikeEmail(email: string): boolean {
  const e = email.trim();
  if (e.length < 5 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateLogin(values: { email: string; password: string }): string | null {
  if (!looksLikeEmail(values.email)) return "Email noto'g'ri.";
  if (!values.password) return "Parol kiriting.";
  return null;
}

export function validateSignupIdentity(values: SignupIdentity): string | null {
  if (!values.fullName.trim()) return "Ism-familiya kiriting.";
  if (!looksLikeEmail(values.email)) return "Email noto'g'ri.";
  if (values.password.length < 8) return "Parol kamida 8 ta belgi bo'lishi kerak.";
  return null;
}
