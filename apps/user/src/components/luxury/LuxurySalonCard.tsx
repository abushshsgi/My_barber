import { Link } from "@tanstack/react-router";
import { Star, MapPin, Heart } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

const AUDIENCE_LABEL: Record<Salon["audience"], string> = {
  men: "Erkaklar",
  women: "Ayollar",
  unisex: "Universal",
};

interface Props {
  salon: Salon;
  variant?: "tall" | "wide";
}

/**
 * Premium portrait card used in the home 2-column luxury grid.
 * Tall variant — 4:5 cover image with editorial overlay,
 * Wide variant — landscape preview for trending rows.
 */
export function LuxurySalonCard({ salon, variant = "tall" }: Props) {
  const { isFav, toggle } = useFavorites();
  const fav = isFav(salon.id);
  const reduce = useReducedMotion();

  const cover = (
    <div
      className={cn(
        "absolute inset-0",
        // deterministic gradient based on salon id
      )}
      style={{
        background: `linear-gradient(135deg, oklch(0.78 0.05 ${(Number(salon.id) * 80) % 360}), oklch(0.32 0.04 ${(Number(salon.id) * 80 + 50) % 360}))`,
      }}
    />
  );

  return (
    <motion.div
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="group relative"
    >
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        className={cn(
          "relative block overflow-hidden rounded-3xl bg-surface shadow-soft ring-1 ring-foreground/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
          variant === "tall" ? "aspect-[4/5]" : "aspect-[5/3]",
        )}
      >
        {cover}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
        />
        {salon.rating >= 4.8 && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-onyx shadow-pill">
            <Star className="h-3 w-3 fill-onyx" strokeWidth={0} />
            Premium
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggle(salon.id);
          }}
          aria-label="Sevimli"
          className={cn(
            "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full transition-colors",
            "bg-background/85 backdrop-blur ring-1 ring-foreground/10 active:scale-90",
          )}
        >
          <Heart
            className={cn("h-4 w-4", fav ? "fill-gold text-gold" : "text-foreground")}
            strokeWidth={2.2}
          />
        </button>

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-ivory">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ivory/70">
              {AUDIENCE_LABEL[salon.audience]} · {salon.category}
            </p>
            <h3 className="mt-0.5 truncate font-display text-lg font-semibold leading-tight">
              {salon.name}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-ivory/85">
              <MapPin className="h-3 w-3" strokeWidth={2.4} />
              <span className="truncate">{salon.address}</span>
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-ivory/15 px-2.5 py-1.5 text-right ring-1 ring-ivory/20 backdrop-blur">
            <p className="flex items-center justify-end gap-1 text-[11px] font-bold tabular-nums">
              <Star className="h-3 w-3 fill-gold text-gold" strokeWidth={0} />
              {salon.rating.toFixed(1)}
            </p>
            <p className="text-[10px] font-semibold text-ivory/75">
              {salon.distanceKm} km
            </p>
          </div>
        </div>
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2 px-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {salon.reviewCount} sharh
        </p>
        <p className="shrink-0 text-[12px] font-bold tabular-nums">
          <span className="text-muted-foreground">dan </span>
          {shortPrice(salon.priceFrom)}
        </p>
      </div>
    </motion.div>
  );
}
