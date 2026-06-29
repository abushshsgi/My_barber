import { useTranslation } from "react-i18next";
import type { SalonSectionUi } from "@/components/desktop/pages/salon-layouts/section-styles";
import { SalonMap } from "@/components/map/SalonMap";
import { cn } from "@/lib/utils";

export function SalonLocationSection({
  address,
  lat,
  lng,
  salonId,
  variant = "stack",
  titleClassName,
}: {
  address: string;
  lat: number;
  lng: number;
  salonId: string;
  variant?: SalonSectionUi["location"];
  titleClassName?: string;
}) {
  const { t } = useTranslation();
  const hasCoords = lat !== 0 && lng !== 0;
  const title = titleClassName ?? "text-xl font-bold tracking-tight";

  const mapEl = hasCoords ? (
    <div
      className={cn(
        "overflow-hidden border border-border",
        variant === "card" ? "h-72 rounded-2xl shadow-md" : "h-64 rounded-2xl",
        variant === "map-first" && "h-80 rounded-xl",
      )}
    >
      <SalonMap
        markers={[{ id: salonId, lat, lng, label: address }]}
        selectedId={null}
        onMarkerSelect={() => {}}
        onMarkerNavigate={() => {}}
        autoFitMarkers
      />
    </div>
  ) : null;

  if (variant === "split" && hasCoords) {
    return (
      <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-3">
          <h2 className={title}>{t("salon.location.title")}</h2>
          <p className="text-base font-medium">{address}</p>
        </div>
        {mapEl}
      </section>
    );
  }

  if (variant === "map-first" && hasCoords) {
    return (
      <section className="space-y-4">
        {mapEl}
        <div>
          <h2 className={title}>{t("salon.location.title")}</h2>
          <p className="mt-2 text-sm font-medium">{address}</p>
        </div>
      </section>
    );
  }

  if (variant === "card") {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-muted/10">
        <div className="border-b border-border px-5 py-4">
          <h2 className={title}>{t("salon.location.title")}</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{address}</p>
        </div>
        {mapEl ? <div className="p-3">{mapEl}</div> : null}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className={title}>{t("salon.location.title")}</h2>
      <p className="text-sm font-medium">{address}</p>
      {mapEl}
    </section>
  );
}
