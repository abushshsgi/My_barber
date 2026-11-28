import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { AudienceProvider } from "@/hooks/use-audience";
import { CurrencyProvider } from "@/hooks/use-currency";
import { AuthSessionGuard } from "@/components/AuthSessionGuard";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { LangAwareOutlet } from "@/components/LangAwareOutlet";
import { UserLayout } from "@/components/UserLayout";
import { ClientOnly } from "@/components/ClientOnly";
import { DeferredClientWidgets } from "@/components/DeferredClientWidgets";
import { MorphLcpRouteGuard } from "@/components/MorphLcpRouteGuard";

const Toaster = lazy(() => import("sonner").then((m) => ({ default: m.Toaster })));

/** To'liq mijoz ilovasi — auth, onboarding, valyuta, real-time. */
export default function InteractiveAppShell() {
  const { queryClient } = useRouteContext({ from: "__root__" });
  return (
    <QueryClientProvider client={queryClient}>
      <AudienceProvider>
        <CurrencyProvider>
          <AuthSessionGuard>
            <OnboardingGuard>
              <UserLayout>
                <LangAwareOutlet />
              </UserLayout>
            </OnboardingGuard>
          </AuthSessionGuard>
          <ClientOnly>
            <MorphLcpRouteGuard />
            <DeferredClientWidgets />
            <Suspense fallback={null}>
              <Toaster position="top-center" />
            </Suspense>
          </ClientOnly>
        </CurrencyProvider>
      </AudienceProvider>
    </QueryClientProvider>
  );
}