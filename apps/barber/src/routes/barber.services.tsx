import { createFileRoute, Navigate, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/barber/primitives";
import { useBarberContext } from "@/components/barber/BarberContext";
import { LayoutSwitcher } from "@/components/barber/services/LayoutSwitcher";
import { ServicesLayoutView } from "@/components/barber/services/layouts";
import { ServicesActivationBanners } from "@/components/barber/services/ServicesBlocks";
import { ServicesPageSkeleton } from "@/components/barber/services/ServicesPageSkeleton";
import type { ServicesLayoutId } from "@/components/barber/services/types";
import { useServicesPage } from "@/components/barber/services/use-services-page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function parseLayout(raw: unknown): ServicesLayoutId {
  const n = Number(raw);
  if (n >= 1 && n <= 8) return n as ServicesLayoutId;
  return 1;
}

export const Route = createFileRoute("/barber/services")({
  component: ServicesSchedulePage,
  validateSearch: (raw: Record<string, unknown>) => ({
    layout: parseLayout(raw.layout),
  }),
});

function ServicesSchedulePage() {
  const { layout } = Route.useSearch();
  const { viewMode, ownsSalon, activeSalonId, fullyReady } = useBarberContext();
  const state = useServicesPage();
  const {
    isSalonOwnerScope,
    scope,
    isBootstrapping,
    isRefreshing,
    savingServices,
    isDirty,
    committedRef,
  } = state;

  useEffect(() => {
    if (isBootstrapping) return;
    const raw = window.location.hash.replace(/^#/, "");
    if (raw === "activation-services") {
      window.requestAnimationFrame(() => {
        document.getElementById(raw)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [isBootstrapping]);

  const blocker = useBlocker({
    shouldBlockFn: useCallback(() => {
      if (isBootstrapping || savingServices) return false;
      if (committedRef.current === null) return false;
      return isDirty();
    }, [committedRef, isBootstrapping, isDirty, savingServices]),
    withResolver: true,
    enableBeforeUnload: true,
    disabled: isBootstrapping,
  });

  if (fullyReady && viewMode === "salon" && ownsSalon && activeSalonId) {
    return <Navigate to="/barber/salon-view" replace />;
  }

  return (
    <>
      <div className="mx-auto max-w-[1180px] space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title={isSalonOwnerScope ? "Salon xizmatlari" : "Xizmatlar"}
          description={
            isSalonOwnerScope
              ? "Salon katalogi — mijoz salon sahifasida shu xizmatlar ko'rinadi."
              : scope === "salon"
                ? "Admin katalogidagi xizmatlarni o'zingizga biriktirib, narxlarni boshqaring."
                : "Mustaqil booking uchun admin katalogidagi xizmatlarni tanlab, narxlarni sozlang."
          }
          actions={
            <div className="flex items-center gap-2">
              {isRefreshing ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
              ) : null}
              <div className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                {isSalonOwnerScope ? "Salon katalogi" : scope === "salon" ? "Salon staff" : "Mustaqil barber"}
              </div>
            </div>
          }
        />

        <LayoutSwitcher current={layout} />
        <ServicesActivationBanners state={state} />

        {isBootstrapping ? (
          <ServicesPageSkeleton />
        ) : (
          <ServicesLayoutView layout={layout} state={state} />
        )}
      </div>

      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saqlanmagan o&apos;zgarishlar</AlertDialogTitle>
            <AlertDialogDescription>
              Sahifadan chiqsangiz, kiritilgan o&apos;zgarishlar yo&apos;qolishi mumkin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={() => blocker.reset?.()}>
              Sahifada qolish
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => blocker.proceed?.()}
            >
              Chiqish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
