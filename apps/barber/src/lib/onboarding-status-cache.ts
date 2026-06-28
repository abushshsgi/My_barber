export type CachedOnboardingStatus = {
  fully_ready?: boolean;
  required_next_path?: string | null;
  owns_salon?: boolean;
  cached_at: number;
};

const CACHE_KEY = "mybarber_onboarding_status";
const READY_KEY = "mybarber_onboarding_ready";
const TTL_MS = 60_000;
const READY_TTL_MS = 24 * 60 * 60 * 1000;

function readReadyPersisted(): CachedOnboardingStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(READY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedOnboardingStatus;
    if (!parsed.cached_at || Date.now() - parsed.cached_at > READY_TTL_MS) {
      localStorage.removeItem(READY_KEY);
      return null;
    }
    return { ...parsed, fully_ready: true };
  } catch {
    return null;
  }
}

export function readOnboardingStatusCache(): CachedOnboardingStatus | null {
  if (typeof window === "undefined") return null;

  const ready = readReadyPersisted();
  if (ready?.fully_ready === true) return ready;

  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedOnboardingStatus;
    const ttl = parsed.fully_ready === true ? READY_TTL_MS : TTL_MS;
    if (!parsed.cached_at || Date.now() - parsed.cached_at > ttl) {
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
    if (st.fully_ready === true) {
      localStorage.setItem(
        READY_KEY,
        JSON.stringify({
          fully_ready: true,
          owns_salon: st.owns_salon,
          cached_at: payload.cached_at,
        }),
      );
    }
  } catch {
    /* ignore quota */
  }
}

export function clearOnboardingStatusCache() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(READY_KEY);
}

export function invalidateOnboardingAfterActivationChange() {
  clearOnboardingStatusCache();
}
