import { Link } from "@tanstack/react-router";
import { Star, MapPin, Heart } from "lucide-react";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

const AUDIENCE_LABEL: Record<Salon["audience"], string> = {
  men: "Erkaklar",
  women: "Ayollar",
  unisex: "Universal",
};

export function SalonCard({ salon }: { salon: Salon }) {
  const { isFav, toggle } = useFavorites();
  const fav = isFav(salon.id);

  return (
    <div className="group">
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        className="block active:scale-[0.98] transition-transform"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, oklch(0.85 0.04 ${(Number(salon.id) * 80) % 360}), oklch(0.45 0.03 ${(Number(salon.id) * 80 + 50) % 360}))`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-bold">
            <Star className="h-3 w-3 fill-foreground" />
            {salon.rating.toFixed(1)}
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <span className="rounded-full bg-background/95 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em]">
              {salon.category}
            </span>
            <span className="rounded-full bg-foreground/85 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-background">
              {AUDIENCE_LABEL[salon.audience]}
            </span>
          </div>
        </div>
      </Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold tracking-tight">{salon.name}</h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                toggle(salon.id);
              }}
              aria-label="Sevimli"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface active:scale-90 transition-transform"
            >
              <Heart
                className={cn("h-3.5 w-3.5", fav && "fill-foreground")}
                strokeWidth={2.4}
              />
            </button>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{salon.address}</span>
            <span>·</span>
            <span className="shrink-0">{salon.distanceKm} km</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            dan
          </p>
          <p className="text-sm font-bold">{shortPrice(salon.priceFrom)}</p>
        </div>
      </div>
    </div>
  );
}
