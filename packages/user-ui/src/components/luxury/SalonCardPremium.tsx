import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Salon } from "../../types/salon";
import { formatKm } from "../../lib/format";
import { RatingStars } from "./RatingStars";
import { MapPin, Star } from "lucide-react";

const AUTO_MS = 3500;

function CardCoverCarousel({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const slides = images.length > 0 ? images : [];
  const multi = slides.length > 1;
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    setIndex(0);
  }, [slides.join("|")]);

  useEffect(() => {
    if (!multi) return;
    const id = window.setInterval(() => {
      if (paused.current) return;
      setIndex((i) => (i + 1) % slides.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [multi, slides.length]);

  if (slides.length === 0) {
    return <div className={className} />;
  }

  return (
    <div
      className={className}
      onPointerDown={() => {
        paused.current = true;
      }}
      onPointerUp={() => {
        window.setTimeout(() => {
          paused.current = false;
        }, 2500);
      }}
    >
      {slides.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt={alt}
          loading={i === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {multi ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === index ? "w-3 bg-white" : "w-1 bg-white/45"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
  const images = useMemo(() => {
    const cover = salon.coverImage?.trim() || "";
    const gallery = (salon.gallery ?? []).map((u) => u.trim()).filter(Boolean);
    const raw = [cover, ...gallery].filter(Boolean);
    return raw.filter((u, i, arr) => arr.indexOf(u) === i);
  }, [salon.coverImage, salon.gallery]);

  if (layout === "horizontal") {
    return (
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        preload="intent"
        className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-3 shadow-soft transition active:scale-[0.99] hover:shadow-card hover:border-foreground/20"
      >
        <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl">
          <CardCoverCarousel images={images} alt={salon.name} className="absolute inset-0" />
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
        <CardCoverCarousel
          images={images}
          alt={salon.name}
          className="absolute inset-0 transition duration-500 group-hover:scale-105"
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
        <CardCoverCarousel
          images={images}
          alt={salon.name}
          className="absolute inset-0 transition duration-500 group-hover:scale-105"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-soft backdrop-blur">
          {salon.isPremium ? "Premium" : "Standart"}
        </span>
        {distanceKm != null && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-semibold text-background backdrop-blur">
            {formatKm(distanceKm)}
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 text-white">
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
