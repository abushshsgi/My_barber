import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { List, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";

/** Airbnb-style pastki carousel balandligi (xarita padding uchun). */
export const MAP_AIRBNB_CARD_STACK = 156;

type Props = {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
  onListOpen: () => void;
};

function SalonSlideCard({ salon }: { salon: Salon }) {
  const coverSrc = salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed);

  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      className="flex h-[132px] overflow-hidden rounded-2xl bg-background shadow-[0_8px_28px_rgba(0,0,0,0.18)] ring-1 ring-black/5 active:scale-[0.98] transition-transform"
    >
      <div className="relative h-full w-[108px] shrink-0 bg-surface">
        <img
          src={coverSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between px-3.5 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold leading-tight tracking-tight">{salon.name}</h3>
          <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
            {salon.address || "—"}
          </p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold">
            {salon.rating > 0 ? (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                {salon.rating.toFixed(1)}
              </span>
            ) : null}
            <span className="text-muted-foreground">{formatDistanceKm(salon.distanceKm)}</span>
          </div>
          {salon.priceFrom > 0 ? (
            <p className="shrink-0 text-right text-[13px] font-bold leading-none">
              {shortPrice(salon.priceFrom)}
              <span className="text-[10px] font-bold text-muted-foreground">+</span>
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function MapAirbnbCarousel({ salons, activeId, onActiveChange, onListOpen }: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !activeId) return;
    const el = root.querySelector(`[data-salon-id="${activeId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  const syncActiveFromScroll = () => {
    const root = scrollRef.current;
    if (!root || salons.length === 0) return;
    const center = root.scrollLeft + root.clientWidth / 2;
    let closestId = salons[0].id;
    let closestDist = Infinity;
    root.querySelectorAll<HTMLElement>("[data-salon-id]").forEach((el) => {
      const id = el.dataset.salonId;
      if (!id) return;
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(elCenter - center);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    });
    if (closestId !== activeId) onActiveChange(closestId);
  };

  const onScroll = () => {
    if (scrollRaf.current != null) return;
    scrollRaf.current = window.requestAnimationFrame(() => {
      scrollRaf.current = null;
      syncActiveFromScroll();
    });
  };

  if (salons.length === 0) return null;

  return (
    <div
      className="absolute inset-x-0 z-30 px-3"
      style={{ bottom: 10 }}
    >
      <div className="mb-2 flex justify-center">
        <button
          type="button"
          onClick={onListOpen}
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-4 py-2 text-[11px] font-bold shadow-md active:scale-95"
        >
          <List className="h-3.5 w-3.5" />
          {t("map.allSalons")} ({salons.length})
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="no-scrollbar flex gap-3 snap-x snap-mandatory overflow-x-auto pb-1"
      >
        {salons.map((s) => (
          <div
            key={s.id}
            data-salon-id={s.id}
            className="w-[calc(100%-4px)] shrink-0 snap-center sm:w-[92%]"
          >
            <SalonSlideCard salon={s} />
          </div>
        ))}
      </div>
    </div>
  );
}
