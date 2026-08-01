import { useTranslation } from "react-i18next";
import type { MasterCardZoneKey, MasterCardZones } from "@/types/barber-master-card";
import { cn } from "@/lib/utils";

const ZONE_COLORS: Record<MasterCardZoneKey, string> = {
  sides: "bg-sky-500/90",
  top: "bg-amber-500/90",
  beard: "bg-emerald-500/90",
};

type Props = {
  zones: MasterCardZones;
  activeZone: MasterCardZoneKey | null;
  onZoneChange: (zone: MasterCardZoneKey | null) => void;
  className?: string;
};

export function ZoneChips({ zones, activeZone, onZoneChange, className }: Props) {
  const { t } = useTranslation();
  const keys = (Object.keys(zones) as MasterCardZoneKey[]).filter((k) => zones[k]);

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {keys.map((zone) => {
        const active = activeZone === zone;
        return (
          <button
            key={zone}
            type="button"
            onClick={() => onZoneChange(active ? null : zone)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold text-white touch-manipulation",
              ZONE_COLORS[zone],
              active ? "ring-2 ring-offset-2 ring-foreground/40" : "opacity-85",
            )}
          >
            <span className="size-1.5 rounded-full bg-white/90" />
            {t(`barberConsult.zones.${zone}`, { defaultValue: zone })}
          </button>
        );
      })}
    </div>
  );
}
