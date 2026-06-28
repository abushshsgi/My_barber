import { createFileRoute, isRedirect, redirect, useRouter } from "@tanstack/react-router";
import { BarberShell } from "@/components/barber/BarberShell";
import { BarberProvider } from "@/components/barber/BarberContext";
import { apiFetch, clearBarberTokens, getBarberAccessToken } from "@/lib/api";
import { isBarberPathAllowedDuringActivation } from "@/lib/barber-activation-gate";
import {
  readOnboardingStatusCache,
  writeOnboardingStatusCache,
} from "@/lib/onboarding-status-cache";
import { normalizeRequiredNextPath } from "@/lib/onboarding-redirect";

function activationRedirectTarget(_ownsSalon?: boolean): string {
  return "/barber";
}

export const Route = createFileRoute("/barber")({
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/barber/verify-email")) {
      const token = new URLSearchParams(location.search).get("token")?.trim() || "";
      throw redirect({
        to: "/verify-email",
        search: token ? { token } : {},
        replace: true,
      });
    }
    if (typeof window !== "undefined" && !getBarberAccessToken()) {
      throw redirect({ to: "/auth" });
    }
    const path = location.pathname;
    const cached = readOnboardingStatusCache();

    if (path.startsWith("/barber/activation") && cached?.fully_ready === true) {
      throw redirect({ to: activationRedirectTarget(cached.owns_salon), replace: true });
    }

    if (isBarberPathAllowedDuringActivation(path)) return;
    if (typeof window === "undefined") return;
    if (!getBarberAccessToken()) return;

    if (cached?.fully_ready === true) {
      return;
    }

    try {
      const res = await apiFetch("/api/v1/barber/onboarding/status/");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearBarberTokens();
          throw redirect({ to: "/auth" });
        }
        return;
      }
      const st = (await res.json()) as {
        fully_ready?: boolean;
        required_next_path?: string | null;
        owns_salon?: boolean;
      };
      writeOnboardingStatusCache(st);
      if (st.fully_ready === true) {
        if (path.startsWith("/barber/activation")) {
          throw redirect({ to: activationRedirectTarget(st.owns_salon), replace: true });
        }
        return;
      }
      const requiredNext = normalizeRequiredNextPath(st);
      if (requiredNext) {
        throw redirect({ to: requiredNext });
      }
      throw redirect({ to: "/barber/activation" });
    } catch (e) {
      if (isRedirect(e)) throw e;
      return;
    }
  },
  component: BarberRoot,
  errorComponent: BarberError,
});

function BarberRoot() {
  return (
    <BarberProvider>
      <BarberShell />
    </BarberProvider>
  );
}

function BarberError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const message =
    error instanceof Error && error.message ? error.message : "Barber panelda xatolik yuz berdi.";
  return (
    <div className="p-8">
      <h2 className="font-heading text-xl font-semibold text-foreground">Barber panelda xatolik</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <button
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Qayta urinish
      </button>
    </div>
  );
}
