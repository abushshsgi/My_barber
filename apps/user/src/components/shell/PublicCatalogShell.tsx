import { Suspense, lazy, useEffect } from "react";
import { explorePerfMarks } from "@/lib/explore-perf-marks";
import { QueryClientProvider } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { AudienceProvider } from "@/hooks/use-audience";
import { LangAwareOutlet } from "@/components/LangAwareOutlet";
import { UserLayout } from "@/components/UserLayout";
import { ClientOnly } from "@/components/ClientOnly";
import { DeferredClientWidgets } from "@/components/DeferredClientWidgets";

const Toaster = lazy(() => import("sonner").then((m) => ({ default: m.Toaster })));

/**
 * Yengil explore ilova qobig'i — AuthSessionGuard, OnboardingGuard,
 * CurrencyProvider va WebSocket sessiyasi yo'q (mehmon katalog).
 */
export function PublicCatalogShell() {
  const { queryClient } = useRouteContext({ from: "__root__" });
  useEffect(() => {
    explorePerfMarks.shellMounted();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AudienceProvider>
        <UserLayout>
          <LangAwareOutlet />
        </UserLayout>
        <ClientOnly>
          <DeferredClientWidgets />
          <Suspense fallback={null}>
            <Toaster position="top-center" />
          </Suspense>
        </ClientOnly>
      </AudienceProvider>
    </QueryClientProvider>
  );
}