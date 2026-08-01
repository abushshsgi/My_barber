import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ViewPresets } from "@/components/barber-consult/ViewPresets";
import { ZoneChips } from "@/components/barber-consult/ZoneChips";
import { EXPLORE_VIEW_IDS, type ExploreViewId } from "@/lib/explore-views";
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
  const [broken, setBroken] = useState<Partial<Record<ExploreViewId, boolean>>>({});

  const availableViews = useMemo(() => {
    const list = EXPLORE_VIEW_IDS.filter((view) => {
      const url = images[view];
      if (!url || broken[view]) return false;
      return true;
    });
    if (list.length === 0 && (fallbackImage || images.front)) return ["front"] as ExploreViewId[];
    return list;
  }, [broken, fallbackImage, images]);

  useEffect(() => {
    if (!availableViews.includes(activeView) && availableViews[0]) {
      onViewChange(availableViews[0]);
    }
  }, [activeView, availableViews, onViewChange]);

  const src = useMemo(() => {
    const preferred = images[activeView];
    if (preferred && !broken[activeView]) return preferred;
    if (images.front && !broken.front) return images.front;
    return fallbackImage;
  }, [activeView, broken, fallbackImage, images]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-border">
        {src ? (
          <img
            key={src}
            src={src}
            alt={t("barberConsult.viewerAlt", { defaultValue: "Hairstyle preview" })}
            className="h-full w-full object-cover"
            draggable={false}
            onError={() => {
              setBroken((prev) => ({ ...prev, [activeView]: true }));
            }}
          />
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
            {t("barberConsult.viewerAlt", { defaultValue: "Hairstyle preview" })}
          </div>
        )}
        {activeZone ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-b",
              ZONE_OVERLAY[activeZone],
            )}
          />
        ) : null}
      </div>
      <ViewPresets
        activeView={activeView}
        onViewChange={onViewChange}
        availableViews={availableViews}
      />
      {availableViews.length <= 1 ? (
        <p className="text-[11px] text-muted-foreground">
          {t("barberConsult.singleViewHint", {
            defaultValue:
              "Bu uslub uchun chap/o‘ng/orqa rasmlar hali yo‘q — try-on / old ko‘rinish ko‘rsatilmoqda.",
          })}
        </p>
      ) : null}
      <ZoneChips zones={zones} activeZone={activeZone} onZoneChange={onZoneChange} />
    </div>
  );
}
