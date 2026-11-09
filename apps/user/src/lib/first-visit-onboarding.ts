export const FIRST_VISIT_ONBOARDING_KEY = "mysaloon_onboarding_v1";
export const FIRST_VISIT_VISIBILITY_EVENT = "mysaloon:first-visit-visibility";

export type FirstVisitStatus = "completed" | "skipped";
export type OnboardingGender = "women" | "men";
export type MainSlideIndex = 0 | 1 | 2;

export type FirstVisitLocation = {
  pathname: string;
  search?: string;
  hash?: string;
};

const AUTH_CALLBACK_KEYS = new Set([
  "access",
  "refresh",
  "token",
  "id_token",
  "access_token",
  "refresh_token",
  "credential",
  "jwt",
  "session",
]);

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

let dismissedThisLoad = false;

function paramsFrom(raw: string | undefined): URLSearchParams {
  const value = (raw || "").trim().replace(/^[?#]/, "");
  if (!value) return new URLSearchParams();
  try {
    return new URLSearchParams(value);
  } catch {
    return new URLSearchParams();
  }
}

function hasAuthCallbackParams(params: URLSearchParams): boolean {
  const keys = new Set([...params.keys()].map((key) => key.toLowerCase()));
  for (const key of keys) {
    if (AUTH_CALLBACK_KEYS.has(key)) return true;
  }
  return keys.has("code") && keys.has("state");
}

export function isAuthCallbackLocation(location: FirstVisitLocation): boolean {
  return (
    hasAuthCallbackParams(paramsFrom(location.search)) ||
    hasAuthCallbackParams(paramsFrom(location.hash))
  );
}

export function readFirstVisitStatus(storage: Pick<Storage, "getItem"> | null): {
  readable: boolean;
  status: FirstVisitStatus | null;
} {
  if (!storage) return { readable: false, status: null };
  try {
    const value = storage.getItem(FIRST_VISIT_ONBOARDING_KEY);
    if (value === "completed" || value === "skipped") {
      return { readable: true, status: value };
    }
    return { readable: true, status: null };
  } catch {
    return { readable: false, status: null };
  }
}

export function writeFirstVisitStatus(
  storage: Pick<Storage, "setItem">,
  status: FirstVisitStatus,
): boolean {
  try {
    storage.setItem(FIRST_VISIT_ONBOARDING_KEY, status);
    return true;
  } catch {
    return false;
  }
}

export function shouldShowFirstVisitOnboarding(input: {
  storage: Pick<Storage, "getItem"> | null;
  hasSession: boolean;
  location: FirstVisitLocation;
}): boolean {
  const { readable, status } = readFirstVisitStatus(input.storage);
  if (!readable || status) return false;
  if (input.hasSession) return false;
  if (isAuthCallbackLocation(input.location)) return false;
  return true;
}

export function readBrowserStorage(): KeyValueStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function shouldShowFirstVisitFromBrowser(hasSession: boolean): boolean {
  if (dismissedThisLoad) return false;
  if (typeof window === "undefined") return false;
  return shouldShowFirstVisitOnboarding({
    storage: readBrowserStorage(),
    hasSession,
    location: {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    },
  });
}

export function dismissFirstVisitForThisLoad(): void {
  dismissedThisLoad = true;
}

export function publishFirstVisitVisibility(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FIRST_VISIT_VISIBILITY_EVENT));
}

export function resetFirstVisitLoadState(): void {
  dismissedThisLoad = false;
}
