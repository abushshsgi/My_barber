import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Calendar, MapPin, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Pin = { x: number; y: number; active?: boolean };

function buildPins(salons: Pick<Salon, "lat" | "lng">[]): Pin[] {
  const valid = salons.filter((s) => s.lat && s.lng);
  if (valid.length === 0) {
    return [
      { x: 28, y: 34 },
      { x: 58, y: 22 },
      { x: 72, y: 48 },
      { x: 42, y: 62 },
      { x: 66, y: 70 },
    ];
  }

  const lats = valid.map((s) => s.lat);
  const lngs = valid.map((s) => s.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 0.01;
  const lngSpan = maxLng - minLng || 0.01;

  return valid.slice(0, 14).map((s, i) => ({
    x: 14 + ((s.lng - minLng) / lngSpan) * 72,
    y: 14 + (1 - (s.lat - minLat) / latSpan) * 68,
    active: i === 0,
  }));
}

type Props = {
  salons?: Pick<Salon, "lat" | "lng">[];
  salonCount?: number;
  className?: string;
};

export function BazaarMapPanel({ salons = [], salonCount = 0, className }: Props) {
  const { t } = useTranslation();
  const pins = useMemo(() => buildPins(salons), [salons]);

  return (
    <aside className={cn("sticky top-28 space-y-3", className)}>
      <Link
        to="/map"
        className="group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
      >
        <div className="relative aspect-[4/5] min-h-[340px] w-full overflow-hidden bg-[#ebe4d8]">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              backgroundImage: `
                linear-gradient(rgba(10,10,10,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(10,10,10,0.04) 1px, transparent 1px),
                linear-gradient(rgba(10,10,10,0.07) 1px, transparent 1px),
                linear-gradient(90deg, rgba(10,10,10,0.07) 1px, transparent 1px)
              `,
              backgroundSize: "28px 28px, 28px 28px, 112px 112px, 112px 112px",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/10 via-transparent to-surface-2/40" />

          <svg className="absolute inset-0 h-full w-full text-foreground/10" aria-hidden>
            <path d="M-10 120 Q 80 90, 160 110 T 360 95" fill="none" stroke="currentColor" strokeWidth="8" />
            <path d="M40 -10 Q 120 60, 100 180 T 140 360" fill="none" stroke="currentColor" strokeWidth="6" />
            <path d="M200 0 L 220 360" fill="none" stroke="currentColor" strokeWidth="5" />
          </svg>

          {pins.map((pin, i) => (
            <span
              key={i}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-full",
                pin.active && "z-10",
              )}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            >
              <span
                className={cn(
                  "block h-3 w-3 rounded-full border-2 border-background shadow-md",
                  pin.active ? "bg-foreground" : "bg-foreground/75",
                )}
              />
              {pin.active ? (
                <span className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/10 animate-ping" />
              ) : null}
            </span>
          ))}

          <span className="absolute left-1/2 top-[58%] z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="relative grid h-9 w-9 place-items-center rounded-full border-2 border-background bg-foreground text-background shadow-lg">
              <MapPin className="h-4 w-4" strokeWidth={2.4} />
            </span>
          </span>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-4 pt-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t("nav.map")}
            </p>
            <p className="mt-1 text-lg font-bold tracking-tight">
              {salonCount > 0
                ? t("home.mapPreview.nearbyCount", {
                    count: salonCount,
                    defaultValue: "{{count}} ta salon yaqinda",
                  })
                : t("home.mapPreview.explore", { defaultValue: "Yaqin salonlarni toping" })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("home.mapPreview.hint", { defaultValue: "Masofa va yo'nalish bilan qulay qidiruv" })}
            </p>
            <span className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background transition group-hover:opacity-95">
              {t("home.mapPreview.openMap", { defaultValue: "Xaritani ochish" })}
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </Link>

      <Link
        to="/today"
        className="flex items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background shadow-sm transition-opacity hover:opacity-90"
      >
        <Calendar className="h-4 w-4" />
        {t("homePage.quick.today")}
      </Link>
      <Link
        to="/ai-style"
        className="flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-semibold hover:bg-surface"
      >
        <Sparkles className="h-4 w-4 text-foreground" />
        {t("homePage.quick.aiStyle")}
      </Link>
    </aside>
  );
}
