import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Star } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

export type SalonPeekVariant = "a" | "b" | "c" | "d" | "e";

export const SALON_PEEK_VARIANT_LABELS: Record<
  SalonPeekVariant,
  { title: string; subtitle: string }
> = {
  a: { title: "A — Klassik", subtitle: "Chap rasm, o'ngda ma'lumot va to'liq tugma" },
  b: { title: "B — Hero", subtitle: "Yuqorida katta surat, pastda ixcham qator" },
  c: { title: "C — Banner", subtitle: "Keng rasm, chip'lar va outline tugma" },
  d: { title: "D — Overlay", subtitle: "Surat ustida gradient va matn" },
  e: { title: "E — Kompakt", subtitle: "Ro'yxat ko'rinishi, kichik rasm va icon tugma" },
};

type LayoutProps = { salon: Salon };

function SalonPeekCover({ salon, className }: { salon: Salon; className?: string }) {
  const fallback = getSalonCoverUrl(salon.coverSeed, salon.category);
  const secondary = getSalonCoverUrl(`${salon.coverSeed}-alt`, salon.category);
  const primary = salon.coverUrl?.trim() || fallback;
  const [src, setSrc] = useState(primary);
  const stepRef = useRef(0);

  useEffect(() => {
    stepRef.current = 0;
    setSrc(salon.coverUrl?.trim() || fallback);
  }, [salon.coverUrl, salon.coverSeed, fallback]);

  const onError = () => {
    stepRef.current += 1;
    if (stepRef.current === 1) setSrc(fallback);
    else if (stepRef.current === 2) setSrc(secondary);
  };

  return (
    <div className={cn("overflow-hidden bg-[#E8E8E8]", className)}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={onError}
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}

function SalonPeekMeta({ salon, className }: { salon: Salon; className?: string }) {
  const distance = formatDistanceKm(salon.distanceKm);

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 text-[11px] font-semibold", className)}>
      {salon.rating > 0 ? (
        <span className="flex items-center gap-0.5">
          <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
          {salon.rating.toFixed(1)}
        </span>
      ) : null}
      {distance !== "—" ? <span className="text-muted-foreground">{distance}</span> : null}
      {salon.priceFrom > 0 ? <span>{shortPrice(salon.priceFrom)}+</span> : null}
    </div>
  );
}

function BookNowLink({
  salon,
  className,
  children,
}: {
  salon: Salon;
  className?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Link
      to="/booking/$salonId"
      params={{ salonId: salon.id }}
      className={className}
    >
      {children ?? t("map.bookNow")}
    </Link>
  );
}

/** A — hozirgi klassik: chap thumbnail + o'ng kontent */
export function SalonPeekCardVariantA({ salon }: LayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-[112px] shrink-0 overflow-hidden rounded-2xl bg-background shadow-[0_6px_24px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
      <div className="h-full w-[108px] shrink-0">
        <Link to="/salon/$id" params={{ id: salon.id }} className="block h-full w-full">
          <SalonPeekCover salon={salon} className="h-full w-full" />
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between px-3 py-2">
        <div className="min-w-0">
          <Link to="/salon/$id" params={{ id: salon.id }}>
            <h3 className="line-clamp-1 text-[14px] font-bold tracking-tight">{salon.name}</h3>
          </Link>
          {salon.address ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{salon.address}</p>
          ) : null}
          <SalonPeekMeta salon={salon} className="mt-1" />
        </div>
        <BookNowLink
          salon={salon}
          className="flex w-full items-center justify-center rounded-xl bg-foreground py-2 text-[12px] font-bold text-background active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </BookNowLink>
      </div>
    </div>
  );
}

/** B — hero: yuqorida katta rasm, pastda qator */
export function SalonPeekCardVariantB({ salon }: LayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="shrink-0 overflow-hidden rounded-2xl bg-background shadow-[0_6px_24px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
      <Link to="/salon/$id" params={{ id: salon.id }} className="block">
        <SalonPeekCover salon={salon} className="h-[72px] w-full" />
      </Link>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <Link to="/salon/$id" params={{ id: salon.id }}>
            <h3 className="line-clamp-1 text-[14px] font-bold tracking-tight">{salon.name}</h3>
          </Link>
          {salon.address ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{salon.address}</p>
          ) : null}
        </div>
        <BookNowLink
          salon={salon}
          className="shrink-0 rounded-full bg-foreground px-3.5 py-2 text-[11px] font-bold text-background active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </BookNowLink>
      </div>
    </div>
  );
}

/** C — banner: keng rasm, chip'lar, outline tugma */
export function SalonPeekCardVariantC({ salon }: LayoutProps) {
  const { t } = useTranslation();
  const distance = formatDistanceKm(salon.distanceKm);

  return (
    <div className="flex h-[120px] shrink-0 overflow-hidden rounded-2xl bg-surface/60 shadow-[0_6px_24px_rgba(0,0,0,0.08)] ring-1 ring-border/50">
      <div className="h-full w-[132px] shrink-0">
        <Link to="/salon/$id" params={{ id: salon.id }} className="block h-full w-full">
          <SalonPeekCover salon={salon} className="h-full w-full rounded-r-none" />
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between px-3 py-2.5">
        <div className="min-w-0">
          <Link to="/salon/$id" params={{ id: salon.id }}>
            <h3 className="line-clamp-1 text-[15px] font-bold tracking-tight">{salon.name}</h3>
          </Link>
          {salon.address ? (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={2.2} />
              <span className="line-clamp-1">{salon.address}</span>
            </p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {salon.rating > 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-background px-2 py-0.5 text-[10px] font-bold ring-1 ring-border/60">
                <Star className="h-2.5 w-2.5 fill-foreground" strokeWidth={0} />
                {salon.rating.toFixed(1)}
              </span>
            ) : null}
            {distance !== "—" ? (
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground ring-1 ring-border/60">
                {distance}
              </span>
            ) : null}
            {salon.priceFrom > 0 ? (
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-bold ring-1 ring-border/60">
                {shortPrice(salon.priceFrom)}+
              </span>
            ) : null}
          </div>
        </div>
        <BookNowLink
          salon={salon}
          className="flex w-full items-center justify-center rounded-xl border border-foreground/20 bg-background py-1.5 text-[11px] font-bold text-foreground active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </BookNowLink>
      </div>
    </div>
  );
}

/** D — overlay: surat ustida gradient va matn */
export function SalonPeekCardVariantD({ salon }: LayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="relative h-[128px] shrink-0 overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(0,0,0,0.16)] ring-1 ring-black/10">
      <SalonPeekCover salon={salon} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
      <div className="relative flex h-full flex-col justify-between p-3 text-white">
        <div className="min-w-0">
          <Link to="/salon/$id" params={{ id: salon.id }}>
            <h3 className="line-clamp-1 text-[15px] font-bold tracking-tight">{salon.name}</h3>
          </Link>
          {salon.address ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-white/80">{salon.address}</p>
          ) : null}
          <SalonPeekMeta salon={salon} className="mt-1 text-white/90 [&_.text-muted-foreground]:text-white/70" />
        </div>
        <div className="flex items-center gap-2">
          <BookNowLink
            salon={salon}
            className="flex flex-1 items-center justify-center rounded-xl bg-white py-2 text-[12px] font-bold text-foreground active:scale-[0.98]"
          >
            {t("map.bookNow")}
          </BookNowLink>
          <Link
            to="/salon/$id"
            params={{ id: salon.id }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm active:scale-[0.98]"
            aria-label={salon.name}
          >
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** E — kompakt: ro'yxat qatori, kichik rasm */
export function SalonPeekCardVariantE({ salon }: LayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-[88px] shrink-0 items-center gap-3 overflow-hidden rounded-2xl bg-background px-3 shadow-[0_4px_18px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        className="h-[64px] w-[64px] shrink-0 overflow-hidden rounded-xl"
      >
        <SalonPeekCover salon={salon} className="h-full w-full" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to="/salon/$id" params={{ id: salon.id }}>
          <h3 className="line-clamp-1 text-[14px] font-bold tracking-tight">{salon.name}</h3>
        </Link>
        {salon.address ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{salon.address}</p>
        ) : null}
        <SalonPeekMeta salon={salon} className="mt-1" />
      </div>
      <BookNowLink
        salon={salon}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background active:scale-[0.98]"
        aria-label={t("map.bookNow") as string}
      >
        <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
      </BookNowLink>
    </div>
  );
}

export const SALON_PEEK_VARIANTS: Record<SalonPeekVariant, ComponentType<LayoutProps>> = {
  a: SalonPeekCardVariantA,
  b: SalonPeekCardVariantB,
  c: SalonPeekCardVariantC,
  d: SalonPeekCardVariantD,
  e: SalonPeekCardVariantE,
};

export function SalonPeekCardByVariant({
  variant,
  salon,
}: {
  variant: SalonPeekVariant;
  salon: Salon;
}) {
  const Card = SALON_PEEK_VARIANTS[variant];
  return <Card salon={salon} />;
}
