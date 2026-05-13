import { createFileRoute, isRedirect, redirect, useRouter } from "@tanstack/react-router";
import { BarberShell } from "@/components/barber/BarberShell";
import { BarberProvider } from "@/components/barber/BarberContext";
import { apiFetch, getBarberAccessToken } from "@/lib/api";

/** 100% gate paytida ham ochiq bo‘lishi kerak bo‘lgan yo‘llar (xizmat/jadvalni to‘ldirish uchun). */
function barberPathAllowedBeforeFullyReady(pathname: string): boolean {
  if (pathname.startsWith("/barber/verify-email")) return true;
  if (pathname.startsWith("/barber/activation")) return true;
  if (pathname === "/barber/services" || pathname.startsWith("/barber/services/")) return true;
  return false;
}

export const Route = createFileRoute("/barber")({
  beforeLoad: async ({ location }) => {
    if (typeof window !== "undefined" && !getBarberAccessToken()) {
      throw redirect({ to: "/auth" });
    }
    const path = location.pathname;
    if (barberPathAllowedBeforeFullyReady(path)) return;
    if (typeof window === "undefined") return;
    if (!getBarberAccessToken()) return;
    try {
      const res = await apiFetch("/api/v1/barber/onboarding/status/");
      if (!res.ok) return;
      const st = (await res.json()) as { fully_ready?: boolean };
      if (st.fully_ready === false) {
        throw redirect({ to: "/barber/activation" });
      }
    } catch (e) {
      if (isRedirect(e)) throw e;
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
  return (
    <div className="p-8">
      <h2 className="font-heading text-xl font-semibold text-foreground">Barber panelda xatolik</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
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
