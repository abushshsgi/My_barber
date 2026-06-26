import { apiFetch, clearBarberTokens, getBarberAccessToken } from "@/lib/api";

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

/** Login / root / onboarding tugagach qayerga yo‘naltirish kerakligini aniqlaydi. */
export async function resolveBarberEntryPath(): Promise<string> {
  if (!getBarberAccessToken()) return "/auth";
  try {
    const res = await apiFetch("/api/v1/barber/onboarding/status/");
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearBarberTokens();
      }
      return "/auth";
    }
    const st = (await res.json()) as OnboardingStatusLite;
    if (st.fully_ready) return "/barber";
    const next = normalizeRequiredNextPath(st);
    if (next) return next;
    return "/barber/activation";
  } catch {
    clearBarberTokens();
    return "/auth";
  }
}
