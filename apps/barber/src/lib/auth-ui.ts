export type SignupFlow = "owner" | "employee" | "mybarber" | "independent";

export type SignupIdentity = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  flow: SignupFlow;
};

function firstString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && v.length > 0) return firstString(v[0]);
  return null;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return { detail: "Server noto'g'ri formatda javob qaytardi." };
  }
}

export function extractApiError(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    const detail = firstString(obj.detail);
    if (detail) return detail;
    const nf = firstString(obj.non_field_errors);
    if (nf) return nf;
    const keys = Object.keys(obj);
    for (const key of keys) {
      if (key === "detail" || key === "non_field_errors") continue;
      const msg = firstString(obj[key]);
      if (msg) return `${key}: ${msg}`;
    }
  }
  return fallback;
}

function looksLikeEmail(email: string): boolean {
  const e = email.trim();
  if (e.length < 5 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
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
