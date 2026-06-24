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
import { looksLikeLoginEmail, validateUzPhoneField } from "@/lib/phone";

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

export type PasswordStrength = {
  score: number;
  label: string;
  colorClass: string;
  barClass: string;
  percent: number;
};

export function validateEmailField(email: string): string | null {
  if (!email.trim()) return "Email kiriting.";
  if (!looksLikeEmail(email)) return "Email noto'g'ri.";
  return null;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: "",
      colorClass: "text-muted-foreground",
      barClass: "bg-muted",
      percent: 0,
    };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const normalized = Math.min(4, Math.max(1, Math.ceil(score * 0.8)));

  if (password.length < 8) {
    return {
      score: 1,
      label: "Juda zaif",
      colorClass: "text-destructive",
      barClass: "bg-destructive",
      percent: 25,
    };
  }
  if (normalized <= 2) {
    return {
      score: 2,
      label: "O'rtacha",
      colorClass: "text-warning",
      barClass: "bg-warning",
      percent: 50,
    };
  }
  if (normalized === 3) {
    return {
      score: 3,
      label: "Yaxshi",
      colorClass: "text-warning",
      barClass: "bg-warning",
      percent: 75,
    };
  }
  return {
    score: 4,
    label: "Kuchli",
    colorClass: "text-success",
    barClass: "bg-success",
    percent: 100,
  };
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return "Parol kamida 8 ta belgi bo'lishi kerak.";
  return null;
}

export function validateLogin(values: { email: string; password: string }): string | null {
  const id = values.email.trim();
  if (!id) return "Email yoki telefon kiriting.";
  if (looksLikeLoginEmail(id)) {
    if (!looksLikeEmail(id)) return "Email noto'g'ri.";
  } else {
    const phoneErr = validateUzPhoneField(id);
    if (phoneErr) return phoneErr;
  }
  if (!values.password) return "Parol kiriting.";
  return null;
}

export function validateSignupIdentity(values: SignupIdentity): string | null {
  if (!values.fullName.trim()) return "Ism-familiya kiriting.";
  const hasEmail = values.email.trim().length > 0;
  const hasPhone = values.phone.trim().length > 0;
  if (!hasEmail && !hasPhone) return "Email yoki telefon kiriting — kamida bittasi.";
  if (hasPhone) {
    const phoneErr = validateUzPhoneField(values.phone);
    if (phoneErr) return phoneErr;
  }
  if (hasEmail) {
    if (!looksLikeEmail(values.email)) return "Email noto'g'ri.";
  }
  const pwdErr = validatePasswordPolicy(values.password);
  if (pwdErr) return pwdErr;
  return null;
}
