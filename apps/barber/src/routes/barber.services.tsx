import { createFileRoute, Navigate, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/barber/primitives";
import { useBarberContext } from "@/components/barber/BarberContext";
import { ServicesCatalogGrid } from "@/components/barber/services/ServicesCatalogGrid";
import { ServicesPageSkeleton } from "@/components/barber/services/ServicesPageSkeleton";
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

export const Route = createFileRoute("/barber/services")({
  component: ServicesSchedulePage,
});

function ServicesSchedulePage() {
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
      <div
        id="activation-services"
        className="min-h-[calc(100dvh-4rem)] w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
      >
        <div className="mx-auto w-full max-w-[1800px] space-y-6">
          <PageHeader
            title={isSalonOwnerScope ? "Salon xizmatlari" : "Xizmatlar"}
            description={
              isSalonOwnerScope
                ? "Admin katalogidagi barcha xizmatlar — faollashtiring va narx belgilang."
                : scope === "salon"
                  ? "Katalogdan xizmatni tanlang, narx qo'ying — avtomatik saqlanadi."
                  : "Mustaqil booking uchun xizmatlarni faollashtiring va narx belgilang."
            }
            actions={
              isRefreshing ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
              ) : null
            }
          />

          {isBootstrapping ? <ServicesPageSkeleton /> : <ServicesCatalogGrid state={state} />}
        </div>
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
