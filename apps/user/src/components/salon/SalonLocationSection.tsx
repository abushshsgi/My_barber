import { useTranslation } from "react-i18next";
import { SalonMap } from "@/components/map/SalonMap";

export function SalonLocationSection({
  address,
  lat,
  lng,
  salonId,
}: {
  address: string;
  lat: number;
  lng: number;
  salonId: string;
}) {
  const { t } = useTranslation();
  const hasCoords = lat !== 0 && lng !== 0;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">{t("salon.location.title")}</h2>
      <p className="text-sm font-medium">{address}</p>
      {hasCoords ? (
        <div className="h-64 overflow-hidden rounded-2xl border border-border">
          <SalonMap
            markers={[{ id: salonId, lat, lng, label: address }]}
            activeId={salonId}
            onMarkerClick={() => {}}
            autoFitMarkers
          />
        </div>
      ) : null}
    </section>
  );
}
