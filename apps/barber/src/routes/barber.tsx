import { createFileRoute, isRedirect, redirect, useRouter } from "@tanstack/react-router";
import { BarberShell } from "@/components/barber/BarberShell";
import { BarberProvider } from "@/components/barber/BarberContext";
import { apiFetch, clearBarberTokens, getBarberAccessToken } from "@/lib/api";
import {
  isBarberPathAllowedDuringActivation,
  isBarberPathAllowedWithoutSubscription,
} from "@/lib/barber-activation-gate";
import {
  readOnboardingStatusCache,
  writeOnboardingStatusCache,
} from "@/lib/onboarding-status-cache";
import { normalizeRequiredNextPath } from "@/lib/onboarding-redirect";
import { isBarberSessionRevokedResponse } from "@/lib/barber-auth-session";
import { fetchShopSubscriptionMe, pathNeedsSubscription } from "@/lib/shop-subscription";

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
    if (typeof window === "undefined") return;
    if (!getBarberAccessToken()) return;

    const cached = readOnboardingStatusCache();

    // Setup phase (not fully ready)
    if (!cached?.fully_ready) {
      if (isBarberPathAllowedDuringActivation(path)) {
        // Still refresh status in background for subscription page after ready
        if (!path.startsWith("/barber/subscription")) return;
      }
      try {
        const res = await apiFetch("/api/v1/barber/onboarding/status/");
        if (!res.ok) {
          let body: unknown;
          try {
            body = await res.clone().json();
          } catch {
            body = undefined;
          }
          if (isBarberSessionRevokedResponse(res.status, body)) {
            clearBarberTokens();
            throw redirect({ to: "/auth" });
          }
          if (isBarberPathAllowedDuringActivation(path)) return;
          return;
        }
        const st = (await res.json()) as {
          fully_ready?: boolean;
          required_next_path?: string | null;
          owns_salon?: boolean;
          has_shop_subscription?: boolean;
        };
        writeOnboardingStatusCache(st);
        if (st.fully_ready !== true) {
          if (isBarberPathAllowedDuringActivation(path)) return;
          const requiredNext = normalizeRequiredNextPath(st);
          if (requiredNext) throw redirect({ to: requiredNext });
          throw redirect({ to: "/barber/activation" });
        }
        // now fully ready — fall through to subscription gate
        if (path.startsWith("/barber/activation")) {
          // handled below
        }
      } catch (e) {
        if (isRedirect(e)) throw e;
        if (isBarberPathAllowedDuringActivation(path)) return;
        return;
      }
    }

    // fully_ready: subscription required for product pages
    if (isBarberPathAllowedWithoutSubscription(path)) {
      if (path.startsWith("/barber/activation")) {
        try {
          const me = await fetchShopSubscriptionMe();
          if (me.has_subscription && me.subscription?.is_active) {
            throw redirect({ to: activationRedirectTarget(), replace: true });
          }
          throw redirect({ to: "/barber/subscription", replace: true });
        } catch (e) {
          if (isRedirect(e)) throw e;
          throw redirect({ to: "/barber/subscription", replace: true });
        }
      }
      return;
    }

    if (pathNeedsSubscription(path)) {
      try {
        const me = await fetchShopSubscriptionMe();
        if (!me.has_subscription || !me.subscription?.is_active) {
          throw redirect({ to: "/barber/subscription", replace: true });
        }
      } catch (e) {
        if (isRedirect(e)) throw e;
        throw redirect({ to: "/barber/subscription", replace: true });
      }
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
