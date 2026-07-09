import { Link } from "@tanstack/react-router";
import type { Salon } from "../../types/salon";
import { formatKm } from "../../lib/format";
import { RatingStars } from "./RatingStars";
import { MapPin, Star } from "lucide-react";

export function SalonCardPremium({
  salon,
  layout = "vertical",
  variant = "solid",
}: {
  salon: Salon;
  layout?: "vertical" | "horizontal";
  variant?: "solid" | "glass";
}) {
  const distanceKm = salon.distance > 0 ? salon.distance : undefined;
  const tag = salon.isPremium ? "Premium" : salon.services[0]?.name;

  if (layout === "horizontal") {
    return (
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        preload="intent"
        className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-3 shadow-soft transition active:scale-[0.99] hover:shadow-card hover:border-foreground/20"
      >
        <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl">
          <img
            src={salon.coverImage}
            alt={salon.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{salon.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {salon.address}
            {distanceKm != null && <span>· {formatKm(distanceKm)}</span>}
          </p>
          <div className="mt-1.5">
            <RatingStars value={salon.rating} count={salon.reviewCount} />
          </div>
        </div>
        <span className="rounded-full bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground shadow-soft transition group-hover:bg-foreground">
          Band qilish
        </span>
      </Link>
    );
  }

  if (variant === "glass") {
    return (
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        preload="intent"
        className="group relative block aspect-[3/4] w-full shrink-0 overflow-hidden rounded-3xl shadow-[0_12px_40px_-16px_rgba(0,0,0,0.35)] transition duration-300 active:scale-[0.98] hover:shadow-[0_18px_48px_-14px_rgba(0,0,0,0.42)]"
      >
        <img
          src={salon.coverImage}
          alt={salon.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/5" />
        <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
          {salon.isPremium ? "Premium" : "Standart"}
        </span>
        {distanceKm != null ? (
          <span className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/25 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
            {formatKm(distanceKm)}
          </span>
        ) : null}
        <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
          <h3 className="truncate text-sm font-bold text-white">{salon.name}</h3>
          <p className="mt-0.5 truncate text-[11px] text-white/80">{salon.address}</p>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
              <span>{salon.rating.toFixed(1)}</span>
              {salon.reviewCount != null ? (
                <span className="font-medium text-white/65">({salon.reviewCount})</span>
              ) : null}
            </span>
            {tag ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                {tag}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      preload="intent"
      className="group block w-full shrink-0 overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-card transition active:scale-[0.98] hover:shadow-luxury"
    >
      <div className="relative aspect-[5/4] overflow-hidden">
        <img src={salon.coverImage} alt={salon.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-soft backdrop-blur">
          {salon.isPremium ? "Premium" : "Standart"}
        </span>
        {distanceKm != null && (
          <span className="absolute right-3 top-3 rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-semibold text-background backdrop-blur">
            {formatKm(distanceKm)}
          </span>
        )}
        <div className="absolute inset-x-3 bottom-3 text-white">
          <h3 className="truncate text-base font-bold drop-shadow">{salon.name}</h3>
          <p className="mt-0.5 truncate text-[11px] text-white/85">{salon.address}</p>
        </div>
      </div>
      <div className="flex items-center justify-between bg-surface px-3.5 py-3">
        <RatingStars value={salon.rating} count={salon.reviewCount} />
        {tag && (
          <span className="rounded-full bg-foreground/5 px-2.5 py-1 text-[10px] font-semibold text-foreground">
            {tag}
          </span>
        )}
      </div>
    </Link>
  );
}
