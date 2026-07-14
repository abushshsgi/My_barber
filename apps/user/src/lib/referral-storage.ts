const STORAGE_KEY = "mysaloon.referralCode";
/** Backend bilan bir xil alifbo (O/0/I/1/L chalkashmasin). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{1,8}$`);

/** URL ?ref= yoki qo'lda kiritilgan kodni tozalash — faqat ruxsat etilgan belgilar. */
export function normalizeReferralCode(raw: unknown): string {
  if (typeof raw !== "string" && typeof raw !== "number") return "";
  const upper = String(raw).trim().toUpperCase();
  return [...upper].filter((ch) => CODE_ALPHABET.includes(ch)).join("").slice(0, 8);
}

function firstSearchValue(raw: unknown): string {
  if (Array.isArray(raw)) return firstSearchValue(raw[0]);
  if (typeof raw === "string" || typeof raw === "number") return String(raw);
  return "";
}

/**
 * /auth?ref= / ?referral= / ?referral_code= / ?code= dan kodni o'qiydi.
 * Ulashish havolalari ba'zan turli parametr nomlari bilan keladi.
 */
export function parseReferralFromSearch(search: Record<string, unknown> | null | undefined): string {
  if (!search) return "";
  for (const key of ["ref", "referral", "referral_code", "code"] as const) {
    const normalized = normalizeReferralCode(firstSearchValue(search[key]));
    if (normalized) return normalized;
  }
  return "";
}

/** window.location.search dan (SSR-safe). */
export function parseReferralFromLocationSearch(search = typeof window !== "undefined" ? window.location.search : ""): string {
  if (!search) return "";
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    for (const key of ["ref", "referral", "referral_code", "code"]) {
      const normalized = normalizeReferralCode(params.get(key) ?? "");
      if (normalized) return normalized;
    }
  } catch {
    // ignore malformed query
  }
  return "";
}

export function buildInviteUrl(code: string, baseOrigin?: string): string {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return "";
  const origin = (baseOrigin || "https://mysaloon.uz").replace(/\/$/, "");
  return `${origin}/auth?ref=${encodeURIComponent(normalized)}`;
}

/** API localhost qaytarsa ham ulashish uchun ochiq domen ishlatiladi. */
export function resolveShareInviteUrl(code: string, apiInviteUrl?: string): string {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return "";
  if (apiInviteUrl) {
    try {
      const parsed = new URL(apiInviteUrl);
      const host = parsed.hostname.toLowerCase();
      if (host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0") {
        return `${parsed.origin}/auth?ref=${encodeURIComponent(normalized)}`;
      }
    } catch {
      // ignore malformed API URL
    }
  }
  return buildInviteUrl(normalized, "https://mysaloon.uz");
}

export function stashReferralCode(raw: unknown): void {
  if (typeof window === "undefined") return;
  const code = normalizeReferralCode(raw);
  if (!code || !CODE_RE.test(code)) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, code);
  } catch {
    // sessionStorage yo'q (private mode) — jim o'tkazamiz.
  }
}

export function getStashedReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value && CODE_RE.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearStashedReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Authdan keyin qaytish yo'li — ochiq redirectga yo'l bermaydi. */
export function safeAuthRedirectPath(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) return undefined;
  if (path === "/auth" || path.startsWith("/auth?")) return undefined;
  return path;
}
