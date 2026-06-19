import { Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

export type DesktopSalonCardVariant = "grid" | "row" | "editorial" | "marketplace";

type Props = {
  salon: Salon;
  variant?: DesktopSalonCardVariant;
};

export function DesktopSalonCard({ salon, variant = "grid" }: Props) {
  const { isFav, toggle } = useFavorites();
  const fav = isFav(salon.id);
  const cover = salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed);
  const isGuestFavorite = salon.rating >= 4.8;

  if (variant === "marketplace") {
    return (
      <Link to="/salon/$id" params={{ id: salon.id }} className="group block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(salon.id);
            }}
            className="absolute right-3 top-3 text-white drop-shadow-md transition-transform hover:scale-110"
            aria-label="Sevimli"
          >
            <Heart
              className={cn("h-6 w-6", fav ? "fill-white" : "fill-black/20 stroke-white stroke-[2px]")}
            />
          </button>
          {isGuestFavorite ? (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold shadow-sm">
              Top tanlov
            </span>
          ) : null}
        </div>
        <div className="mt-3 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold leading-snug">{salon.name}</h3>
            <span className="flex shrink-0 items-center gap-0.5 text-[15px] font-normal">
              <Star className="h-3.5 w-3.5 fill-foreground" />
              {salon.rating.toFixed(1)}
            </span>
          </div>
          <p className="truncate text-[15px] text-muted-foreground">
            {salon.category} · {salon.distanceKm} km
          </p>
          <p className="text-[15px]">
            <span className="font-semibold">{shortPrice(salon.priceFrom)}</span>
            <span className="font-normal text-muted-foreground"> dan</span>
          </p>
        </div>
      </Link>
    );
  }

  if (variant === "row") {
    return (
      <div className="group flex items-center gap-4 rounded-2xl border border-border bg-background p-3 transition-shadow hover:shadow-md">
        <Link to="/salon/$id" params={{ id: salon.id }} className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl">
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link to="/salon/$id" params={{ id: salon.id }}>
              <h3 className="truncate text-sm font-bold">{salon.name}</h3>
            </Link>
            <button type="button" onClick={() => toggle(salon.id)} className="shrink-0 text-muted-foreground">
              <Heart className={cn("h-4 w-4", fav && "fill-foreground text-foreground")} />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{salon.category}</p>
          <div className="mt-2 flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-foreground" /> {salon.rating}
            </span>
            <span className="text-muted-foreground">·</span>
            <span>{shortPrice(salon.priceFrom)}+</span>
          </div>
        </div>
        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className="hidden shrink-0 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background xl:block"
        >
          Bron
        </Link>
      </div>
    );
  }

  if (variant === "editorial") {
    return (
      <Link to="/salon/$id" params={{ id: salon.id }} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface">
          <img src={cover} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" loading="lazy" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggle(salon.id);
            }}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90"
          >
            <Heart className={cn("h-4 w-4", fav && "fill-foreground text-foreground")} />
          </button>
        </div>
        <h3 className="mt-4 text-xl font-bold tracking-tight">{salon.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {salon.category} · {salon.distanceKm} km · {shortPrice(salon.priceFrom)}+
        </p>
      </Link>
    );
  }

  return (
    <div className="group">
      <Link to="/salon/$id" params={{ id: salon.id }} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface">
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggle(salon.id);
            }}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/90"
          >
            <Heart className={cn("h-3.5 w-3.5", fav && "fill-foreground text-foreground")} />
          </button>
        </div>
        <div className="mt-3">
          <h3 className="truncate text-sm font-bold">{salon.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1 text-foreground">
              <Star className="h-3 w-3 fill-foreground" /> {salon.rating}
            </span>
            <span>·</span>
            <span>{shortPrice(salon.priceFrom)}+</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
