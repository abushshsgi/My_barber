/** Agent referral code — localStorage + QR parse (`?ref=` / sof kod). */

const STORAGE_KEY = "mysaloon_agent_ref";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun
export const AGENT_CODE_LENGTH = 8;

type StoredRef = { code: string; savedAt: number };

/** Agent alphabet: O/0, I/1, L chalkashligisiz (backend bilan bir xil). */
const AGENT_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function normalizeAgentCode(raw: string): string {
  const upper = (raw || "").trim().toUpperCase();
  let out = "";
  for (const ch of upper) {
    if (AGENT_CODE_CHARS.includes(ch)) out += ch;
    if (out.length >= AGENT_CODE_LENGTH) break;
  }
  return out;
}

export function isCompleteAgentCode(code: string): boolean {
  return normalizeAgentCode(code).length === AGENT_CODE_LENGTH;
}

/**
 * QR payload: to‘liq invite URL yoki sof 8 belgi kod.
 * Masalan: https://partner.mysaloon.uz/auth?ref=ABCD2345&tab=signup
 */
export function parseAgentCodeFromPayload(raw: string): string | null {
  const text = (raw || "").trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get("ref") || url.searchParams.get("agent");
    if (fromQuery) {
      const code = normalizeAgentCode(fromQuery);
      if (isCompleteAgentCode(code)) return code;
    }
  } catch {
    /* sof matn */
  }

  const queryMatch = text.match(/[?&#](?:ref|agent)=([A-Za-z0-9_-]+)/i);
  if (queryMatch?.[1]) {
    const code = normalizeAgentCode(queryMatch[1]);
    if (isCompleteAgentCode(code)) return code;
  }

  const code = normalizeAgentCode(text);
  return isCompleteAgentCode(code) ? code : null;
}

export function setStoredAgentRef(code: string): string | null {
  if (typeof window === "undefined") return null;
  const normalized = normalizeAgentCode(code);
  if (!isCompleteAgentCode(normalized)) return null;
  const payload: StoredRef = { code: normalized, savedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  return normalized;
}

export function captureAgentRefFromSearch(search: {
  ref?: string;
  agent?: string;
}): string | null {
  if (typeof window === "undefined") return null;
  const raw = search.ref || search.agent || "";
  const code = normalizeAgentCode(raw);
  if (!isCompleteAgentCode(code)) return getStoredAgentRef();
  return setStoredAgentRef(code);
}

export function getStoredAgentRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRef;
    if (!parsed?.code || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const code = normalizeAgentCode(parsed.code);
    return isCompleteAgentCode(code) ? code : null;
  } catch {
    return null;
  }
}

export function clearStoredAgentRef(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
