/** Agent referral code — localStorage (QR ?ref=). */

const STORAGE_KEY = "mysaloon_agent_ref";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun

type StoredRef = { code: string; savedAt: number };

function normalizeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, 8);
}

export function captureAgentRefFromSearch(search: {
  ref?: string;
  agent?: string;
}): string | null {
  if (typeof window === "undefined") return null;
  const raw = search.ref || search.agent || "";
  const code = normalizeCode(raw);
  if (!code) return getStoredAgentRef();
  const payload: StoredRef = { code, savedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  return code;
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
    return normalizeCode(parsed.code) || null;
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
