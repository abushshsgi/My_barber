import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ViewPresets } from "@/components/barber-consult/ViewPresets";
import { ZoneChips } from "@/components/barber-consult/ZoneChips";
import type { ExploreViewId } from "@/lib/explore-views";
import type { MasterCardZoneKey, MasterCardZones } from "@/types/barber-master-card";
import { cn } from "@/lib/utils";

type Props = {
  images: Partial<Record<ExploreViewId, string>>;
  fallbackImage: string;
  activeView: ExploreViewId;
  onViewChange: (view: ExploreViewId) => void;
  zones: MasterCardZones;
  activeZone: MasterCardZoneKey | null;
  onZoneChange: (zone: MasterCardZoneKey | null) => void;
  className?: string;
};

const ZONE_OVERLAY: Record<MasterCardZoneKey, string> = {
  sides: "from-sky-500/35 via-transparent to-transparent",
  top: "from-amber-500/40 via-transparent to-transparent",
  beard: "from-transparent via-transparent to-emerald-500/40",
};

export function MultiAngleViewer({
  images,
  fallbackImage,
  activeView,
  onViewChange,
  zones,
  activeZone,
  onZoneChange,
  className,
}: Props) {
  const { t } = useTranslation();
  const src = useMemo(
    () => images[activeView] || images.front || fallbackImage,
    [activeView, fallbackImage, images],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-border">
        <img
          src={src}
          alt={t("barberConsult.viewerAlt", { defaultValue: "Hairstyle preview" })}
          className="h-full w-full object-cover"
          draggable={false}
        />
        {activeZone ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-b",
              ZONE_OVERLAY[activeZone],
            )}
          />
        ) : null}
      </div>
      <ViewPresets activeView={activeView} onViewChange={onViewChange} />
      <ZoneChips zones={zones} activeZone={activeZone} onZoneChange={onZoneChange} />
    </div>
  );
}
