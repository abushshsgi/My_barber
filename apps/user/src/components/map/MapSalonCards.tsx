import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

const CARD_HEIGHT = 132;
const IMAGE_WIDTH = 120;

type Props = {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
};

function SalonCoverImage({
  salon,
  className,
  eager = false,
}: {
  salon: Salon;
  className?: string;
  eager?: boolean;
}) {
  const fallback = getSalonCoverUrl(salon.coverSeed);
  const primary = salon.coverUrl?.trim() || fallback;

  return (
    <div className={cn("overflow-hidden bg-[#E8E8E8]", className)}>
      <img
        src={primary}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src !== fallback) img.src = fallback;
        }}
        className="block h-full w-full object-cover object-center"
      />
    </div>
  );
}

function SalonPeekCard({ salon }: { salon: Salon }) {
  const { t } = useTranslation();
  const distance = formatDistanceKm(salon.distanceKm);
  const hasMeta = salon.rating > 0 || distance !== "—" || salon.priceFrom > 0;

  return (
    <div
      className="flex overflow-hidden rounded-2xl bg-background shadow-[0_4px_18px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
      style={{ height: CARD_HEIGHT }}
    >
      <div className="h-full shrink-0 overflow-hidden" style={{ width: IMAGE_WIDTH }}>
        <Link
          to="/salon/$id"
          params={{ id: salon.id }}
          className="block h-full w-full active:opacity-95"
        >
          <SalonCoverImage salon={salon} className="h-full w-full" eager />
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <Link to="/salon/$id" params={{ id: salon.id }}>
            <h3 className="line-clamp-2 text-[14px] font-bold leading-snug tracking-tight">{salon.name}</h3>
          </Link>
          {salon.address ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-muted-foreground">
              {salon.address}
            </p>
          ) : null}
          {hasMeta ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold">
              {salon.rating > 0 ? (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                  {salon.rating.toFixed(1)}
                  {salon.reviewCount > 0 ? (
                    <span className="text-muted-foreground">({salon.reviewCount})</span>
                  ) : null}
                </span>
              ) : null}
              {distance !== "—" ? <span className="text-muted-foreground">{distance}</span> : null}
              {salon.priceFrom > 0 ? <span>{shortPrice(salon.priceFrom)}+</span> : null}
            </div>
          ) : null}
        </div>

        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className="mt-1.5 flex w-full items-center justify-center rounded-xl bg-foreground py-2 text-[12px] font-bold text-background active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </Link>
      </div>
    </div>
  );
}

export function MapSalonCards({ salons, activeId, onActiveChange }: Props) {
  const activeIndex = salons.findIndex((s) => s.id === activeId);
  const activeSalon = activeIndex >= 0 ? salons[activeIndex] : salons[0];
  const canPrev = activeIndex > 0;
  const canNext = activeIndex >= 0 && activeIndex < salons.length - 1;

  if (!activeSalon) return null;

  const goPrev = () => {
    if (canPrev) onActiveChange(salons[activeIndex - 1].id);
  };

  const goNext = () => {
    if (canNext) onActiveChange(salons[activeIndex + 1].id);
  };

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 px-3"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-md rounded-[22px] bg-background/98 p-3 shadow-[0_12px_48px_rgba(0,0,0,0.2)] ring-1 ring-border/40 backdrop-blur-md">
        <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
          <div className="flex justify-center flex-1">
            <div className="h-1 w-9 rounded-full bg-border/80" aria-hidden />
          </div>
          {salons.length > 1 ? (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {activeIndex + 1} / {salons.length}
            </span>
          ) : null}
        </div>

        <div className="relative">
          <SalonPeekCard salon={activeSalon} />

          {salons.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                disabled={!canPrev}
                aria-label="Oldingi salon"
                className={cn(
                  "absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-background shadow-md ring-1 ring-border/60 active:scale-95",
                  !canPrev && "pointer-events-none opacity-30",
                )}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canNext}
                aria-label="Keyingi salon"
                className={cn(
                  "absolute right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-background shadow-md ring-1 ring-border/60 active:scale-95",
                  !canNext && "pointer-events-none opacity-30",
                )}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
