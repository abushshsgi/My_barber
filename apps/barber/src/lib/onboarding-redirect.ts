import { apiFetch, getBarberAccessToken } from "@/lib/api";

export type OnboardingStatusLite = {
  fully_ready?: boolean;
  is_complete?: boolean;
  required_next_path?: string | null;
};

/** Login / root / onboarding tugagach qayerga yo‘naltirish kerakligini aniqlaydi. */
export async function resolveBarberEntryPath(): Promise<string> {
  if (!getBarberAccessToken()) return "/auth";
  try {
    const res = await apiFetch("/api/v1/barber/onboarding/status/");
    if (!res.ok) return "/auth";
    const st = (await res.json()) as OnboardingStatusLite;
    if (st.required_next_path) return st.required_next_path;
    if (st.fully_ready) return "/barber";
    return "/barber/activation";
  } catch {
    return "/auth";
  }
}
