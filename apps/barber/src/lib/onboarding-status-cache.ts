export type CachedOnboardingStatus = {
  fully_ready?: boolean;
  required_next_path?: string | null;
  owns_salon?: boolean;
  cached_at: number;
};

const CACHE_KEY = "mybarber_onboarding_status";
const TTL_MS = 60_000;

export function readOnboardingStatusCache(): CachedOnboardingStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedOnboardingStatus;
    if (!parsed.cached_at || Date.now() - parsed.cached_at > TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeOnboardingStatusCache(
  st: Pick<CachedOnboardingStatus, "fully_ready" | "required_next_path" | "owns_salon">,
) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedOnboardingStatus = { ...st, cached_at: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function clearOnboardingStatusCache() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CACHE_KEY);
}

export function invalidateOnboardingAfterActivationChange() {
  clearOnboardingStatusCache();
}
