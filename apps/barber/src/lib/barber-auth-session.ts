import {
  API_BASE,
  clearBarberTokens,
  getBarberAccessToken,
  setBarberTokens,
} from "@/lib/api";
import { clearOnboardingStatusCache } from "@/lib/onboarding-status-cache";

const REFRESH_KEY_BARBER = "mybarber_barber_refresh";
const REMEMBER_KEY = "mybarber_barber_remember";

function readRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY_BARBER) || sessionStorage.getItem(REFRESH_KEY_BARBER);
}

function getRememberPreference(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(REMEMBER_KEY);
  if (v === "0") return false;
  return true;
}

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number; type?: string };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isBarberTokenExpired(token: string, skewSeconds = 30): boolean {
  const exp = decodeJwtExp(token);
  if (exp == null) return false;
  return exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export function isBarberAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export function isBarberTokenErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("token expired") ||
    lower.includes("token not valid") ||
    lower.includes("not authenticated") ||
    lower.includes("authentication credentials")
  );
}

export function hasValidBarberSession(): boolean {
  if (typeof window === "undefined") return false;
  const access = getBarberAccessToken();
  if (access && !isBarberTokenExpired(access)) return true;
  const refresh = readRefreshToken();
  if (refresh && !isBarberTokenExpired(refresh)) return true;
  return false;
}

function redirectToAuthIfNeeded(reason?: "expired") {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/auth" || path.startsWith("/auth/")) return;
  const url = reason === "expired" ? "/auth?session=expired" : "/auth";
  window.location.assign(url);
}

let authFailureHandled = false;

/** Sessiya tugaganda tokenlarni tozalab login sahifasiga yo'naltiradi. */
export function handleBarberAuthFailure(reason?: "expired") {
  if (authFailureHandled) return;
  authFailureHandled = true;
  clearBarberTokens();
  clearOnboardingStatusCache();
  redirectToAuthIfNeeded(reason);
}

export function resetBarberAuthFailureGuard() {
  authFailureHandled = false;
}

export const BARBER_SESSION_REFRESHED_EVENT = "barber-session-refreshed";

function notifySessionRefreshed() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BARBER_SESSION_REFRESHED_EVENT));
}

let sessionBootstrapped = false;
let bootstrapInFlight: Promise<boolean> | null = null;

type RefreshResult = { access: string | null; revoked: boolean };

export async function refreshBarberAccessToken(): Promise<RefreshResult> {
  const refresh = readRefreshToken();
  if (!refresh || isBarberTokenExpired(refresh)) {
    return { access: null, revoked: true };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/barber/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      const access = getBarberAccessToken();
      if (access && isBarberAuthFailureStatus(res.status)) {
        const meRes = await fetch(`${API_BASE}/api/v1/barber/auth/me/`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (meRes.ok) return { access, revoked: false };
      }
      return { access: null, revoked: isBarberAuthFailureStatus(res.status) };
    }

    const body = (await res.json().catch(() => ({}))) as { access?: string; refresh?: string };
    if (!body.access || !body.refresh) {
      return { access: null, revoked: true };
    }
    setBarberTokens(body.access, body.refresh, getRememberPreference());
    notifySessionRefreshed();
    return { access: body.access, revoked: false };
  } catch {
    return { access: null, revoked: false };
  }
}

/** Tab ochilganda yoki access tugasa refresh orqali sessiyani tiklash. */
export async function bootstrapBarberSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (sessionBootstrapped) return hasValidBarberSession();
  if (bootstrapInFlight) return bootstrapInFlight;

  bootstrapInFlight = (async () => {
    const access = getBarberAccessToken();
    const refresh = readRefreshToken();

    if (!access && !refresh) {
      sessionBootstrapped = true;
      return false;
    }

    if (access && !isBarberTokenExpired(access)) {
      sessionBootstrapped = true;
      return true;
    }

    if (refresh && !isBarberTokenExpired(refresh)) {
      const refreshed = await refreshBarberAccessToken();
      sessionBootstrapped = true;
      if (refreshed.access) return true;
      if (refreshed.revoked) {
        clearBarberTokens();
        clearOnboardingStatusCache();
      }
      return false;
    }

    clearBarberTokens();
    clearOnboardingStatusCache();
    sessionBootstrapped = true;
    return false;
  })();

  try {
    return await bootstrapInFlight;
  } finally {
    bootstrapInFlight = null;
  }
}

export function resetBarberSessionBootstrap() {
  sessionBootstrapped = false;
  bootstrapInFlight = null;
}
