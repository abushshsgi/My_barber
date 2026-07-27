import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ClientOnly } from "@/components/ClientOnly";
import { MobileBackButton } from "@/components/mobile/MobileBackButton";
import { SalonMap } from "@/components/map/SalonMap";
import { SalonPageSkeleton } from "@/components/salon/SalonPageSkeleton";
import { useSalonPage } from "@/hooks/use-salon-page";
import { navigateBack } from "@/lib/mobile-back";

export const Route = createFileRoute("/salon/$id/location")({
  ssr: false,
  component: SalonLocationPage,
});

function SalonLocationPage() {
  const { id } = useParams({ from: "/salon/$id/location" });
  const { t } = useTranslation();
  const router = useRouter();
  const { salon, isLoading } = useSalonPage(id);
  const hasCoords = Boolean(salon && salon.lat !== 0 && salon.lng !== 0);

  if (isLoading || !salon) {
    return <SalonPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white">
      <header
        className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-white px-4 py-3"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
      >
        <MobileBackButton
          onClick={() => navigateBack(router, `/salon/${salon.id}`)}
          aria-label={t("common.back", { defaultValue: "Orqaga" })}
        />
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{t("salon.nav.location")}</h1>
          <p className="truncate text-xs text-muted-foreground">{salon.name}</p>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        <div className="flex items-start gap-2 rounded-2xl border border-border bg-white p-4">
          <MapPin className="mt-0.5 size-4 shrink-0 text-foreground" />
          <p className="text-sm leading-relaxed text-foreground">{salon.address}</p>
        </div>

        {hasCoords ? (
          <div className="h-[min(70vh,28rem)] overflow-hidden rounded-[1.5rem] border border-border shadow-[0_10px_32px_-14px_rgba(0,0,0,0.16)]">
            <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
              <SalonMap
                markers={[{ id: salon.id, lat: salon.lat, lng: salon.lng, label: salon.address }]}
                selectedId={null}
                onMarkerSelect={() => {}}
                onMarkerNavigate={() => {}}
                autoFitMarkers
              />
            </ClientOnly>
          </div>
        ) : null}

        <Link
          to="/map"
          preload="intent"
          className="flex w-full items-center justify-center rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background"
        >
          {t("common.viewMap")}
        </Link>
      </div>
    </div>
  );
}
