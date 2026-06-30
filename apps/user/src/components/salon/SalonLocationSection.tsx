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
      <h2 className="text-2xl font-semibold tracking-tight">{t("salon.location.title")}</h2>
      <p className="text-base font-medium">{address}</p>
      {hasCoords ? (
        <div className="h-80 overflow-hidden rounded-2xl border border-border shadow-sm">
          <SalonMap
            markers={[{ id: salonId, lat, lng, label: address }]}
            selectedId={null}
            onMarkerSelect={() => {}}
            onMarkerNavigate={() => {}}
            autoFitMarkers
          />
        </div>
      ) : null}
    </section>
  );
}
