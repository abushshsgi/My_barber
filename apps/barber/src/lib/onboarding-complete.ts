import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { OnboardingStatusLite } from "@/lib/onboarding-redirect";

type NavigateFn = (opts: { to: string; replace?: boolean }) => void | Promise<void>;

type FinishOptions = {
  /** Setup wizard yakunlanganda — foydalanuvchini qayta setup sahifasiga qaytarmaslik. */
  afterSetup?: boolean;
};

/** Onboarding tugagach to‘g‘ri yo‘nalishga — dashboard faqat fully_ready bo‘lsa. */
export async function finishOnboardingAndGo(
  navigate: NavigateFn,
  message?: string,
  opts?: FinishOptions,
): Promise<void> {
  if (message) toast.success(message);
  try {
    const res = await apiFetch("/api/v1/barber/onboarding/status/");
    if (!res.ok) {
      await navigate({ to: "/barber/activation", replace: true });
      return;
    }
    const st = (await res.json()) as OnboardingStatusLite;
    if (!opts?.afterSetup && st.required_next_path) {
      await navigate({ to: st.required_next_path, replace: true });
      return;
    }
    if (st.fully_ready) {
      await navigate({ to: "/barber", replace: true });
      return;
    }
    await navigate({ to: "/barber/activation", replace: true });
  } catch {
    await navigate({ to: "/barber/activation", replace: true });
  }
}

/** @deprecated Aktivatsiya bypass o‘chirilgan — xavfsizlik uchun ishlatilmaydi. */
export function shouldSkipActivationGate(): boolean {
  return false;
}

export function markOnboardingJustCompleted(): void {
  /* bypass o‘chirilgan */
}

export function clearOnboardingJustCompleted(): void {
  /* bypass o‘chirilgan */
}
