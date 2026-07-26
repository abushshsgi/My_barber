import { apiFetch, clearBarberTokens, getBarberAccessToken } from "@/lib/api";
import {
  bootstrapBarberSession,
  isBarberSessionRevokedResponse,
  isBarberTokenExpired,
} from "@/lib/barber-auth-session";
import { writeOnboardingStatusCache } from "@/lib/onboarding-status-cache";

export type OnboardingStatusLite = {
  fully_ready?: boolean;
  is_complete?: boolean;
  required_next_path?: string | null;
  owns_salon?: boolean;
};

/** Salon yaratilgandan keyin qayta create/setup sahifasiga qaytarmaslik. */
export function normalizeRequiredNextPath(st: OnboardingStatusLite): string | null {
  const path = st.required_next_path;
  if (!path) return null;
  if (st.owns_salon && (path === "/salon/create" || path === "/mybarber/setup")) {
    return null;
  }
  return path;
}

async function readErrorBody(res: Response): Promise<unknown> {
  try {
    return await res.clone().json();
  } catch {
    return undefined;
  }
}

/** Login / root / onboarding tugagach qayerga yo‘naltirish kerakligini aniqlaydi. */
export async function resolveBarberEntryPath(): Promise<string> {
  const access = getBarberAccessToken();
  if (!access) return "/auth";

  // Muddati o‘tgan access bilan anonim GET yubormaslik.
  if (isBarberTokenExpired(access)) {
    const ok = await bootstrapBarberSession();
    if (!ok || !getBarberAccessToken()) return "/auth";
  }

  try {
    const res = await apiFetch("/api/v1/barber/onboarding/status/");
    if (!res.ok) {
      const body = await readErrorBody(res);
      if (res.status === 401 || isBarberSessionRevokedResponse(res.status, body)) {
        clearBarberTokens();
        return "/auth";
      }
      if (res.status === 403) {
        const token = getBarberAccessToken();
        // Stale/anonim 403 (eski backend) yoki kutilmagan gate — panelga tashlamaymiz.
        if (!token || isBarberTokenExpired(token)) {
          clearBarberTokens();
          return "/auth";
        }
        return "/barber/activation";
      }
      return "/auth";
    }
    const st = (await res.json()) as OnboardingStatusLite;
    writeOnboardingStatusCache(st);
    if (st.fully_ready) return "/barber";
    const next = normalizeRequiredNextPath(st);
    if (next) return next;
    return "/barber/activation";
  } catch {
    const token = getBarberAccessToken();
    if (!token || isBarberTokenExpired(token)) {
      clearBarberTokens();
      return "/auth";
    }
    return "/barber";
  }
}
