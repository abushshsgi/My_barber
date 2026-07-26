import { Link } from "@tanstack/react-router";
import { Heart, Star, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SalonCoverImg } from "@/components/salon/SalonCoverImg";
import { useFavorites } from "@/hooks/use-favorites";
import { resolveMediaUrl } from "@/lib/media-url";
import { shortPrice, type Category, type Salon } from "@/lib/mock-data";
import type { BarberDiscovery } from "@/lib/mappers/barber";
import { prefetchSalonDetail } from "@/lib/prefetch-salon";
import { cn } from "@/lib/utils";

/** UI kit — yumaloq rasm + title/★ + kulrang meta + narx. */
export const HOME_CARD_RADIUS = "rounded-[1.75rem]";
export const HOME_CARD_ASPECT = "aspect-[4/3]";

function FavHeartButton({ salonId }: { salonId: string }) {
  const { isFav, toggle } = useFavorites();
  const fav = isFav(salonId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(salonId);
      }}
      className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/95 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)] backdrop-blur-md transition active:scale-95"
      aria-label="Sevimli"
    >
      <Heart
        className={cn(
          "size-[16px]",
          fav ? "fill-foreground text-foreground" : "fill-transparent text-foreground",
        )}
        strokeWidth={2}
      />
    </button>
  );
}

function ListingBody({
  title,
  rating,
  reviewCount,
  meta,
  priceFrom,
  priceTo,
}: {
  title: string;
  rating: number;
  reviewCount: number;
  meta: string[];
  priceFrom: number;
  priceTo?: number;
}) {
  const { t } = useTranslation();
  const cleanMeta = meta.map((p) => p.trim()).filter(Boolean);
  const showStrike = typeof priceTo === "number" && priceTo > priceFrom && priceFrom > 0;
  const suffix = t("map.priceFromSuffix", { defaultValue: "dan" });

  return (
    <div className="mt-2.5 min-h-[4.25rem] px-0.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-snug tracking-tight text-foreground">
          {title}
        </h3>
        {rating > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 pt-0.5 text-[13px] leading-none text-foreground">
            <Star className="size-3 fill-foreground" strokeWidth={0} />
            <span className="tabular-nums">{rating.toFixed(2)}</span>
            {reviewCount > 0 ? <span className="text-foreground/80">({reviewCount})</span> : null}
          </span>
        ) : null}
      </div>
      {cleanMeta.length > 0 ? (
        <p className="mt-0.5 truncate text-[12px] leading-snug text-muted-foreground">
          {cleanMeta.join(" · ")}
        </p>
      ) : (
        <p className="mt-0.5 h-[1.125rem]" aria-hidden />
      )}
      {priceFrom > 0 ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[13px] leading-snug">
          {showStrike ? (
            <span className="text-muted-foreground line-through">{shortPrice(priceTo!)}</span>
          ) : null}
          <span>
            <span className="font-semibold text-foreground">{shortPrice(priceFrom)}</span>
            <span className="font-normal text-foreground"> {suffix}</span>
          </span>
        </p>
      ) : (
        <p className="mt-1 h-[1.25rem]" aria-hidden />
      )}
    </div>
  );
}

function HeartChrome({ salonId }: { salonId?: string | null }) {
  if (salonId) return <FavHeartButton salonId={salonId} />;
  return (
    <span
      className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/95 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)] backdrop-blur-md"
      aria-hidden
    >
      <Heart className="size-[16px] fill-transparent text-foreground" strokeWidth={2} />
    </span>
  );
}

function ListingMediaShell({
  children,
  favoriteSalonId,
}: {
  children: ReactNode;
  favoriteSalonId?: string | null;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", HOME_CARD_ASPECT, HOME_CARD_RADIUS)}>
      {children}
      <HeartChrome salonId={favoriteSalonId} />
    </div>
  );
}

export function HomeSalonListingCard({ salon }: { salon: Salon }) {
  const { t } = useTranslation();
  const meta = [
    t(`home.categories.${salon.category}`),
    salon.distanceKm > 0 ? `${salon.distanceKm} km` : "",
    salon.address || "",
  ];

  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      preload="intent"
      onPointerEnter={() => prefetchSalonDetail(salon.id)}
      onTouchStart={() => prefetchSalonDetail(salon.id)}
      className="group block active:opacity-95"
    >
      <ListingMediaShell favoriteSalonId={salon.id}>
        <SalonCoverImg
          src={salon.coverUrl}
          seed={salon.coverSeed}
          category={salon.category}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition duration-700 group-active:scale-[1.02]"
        />
      </ListingMediaShell>
      <ListingBody
        title={salon.name}
        rating={salon.rating}
        reviewCount={salon.reviewCount}
        meta={meta}
        priceFrom={salon.priceFrom}
        priceTo={salon.priceTo}
      />
    </Link>
  );
}

export function HomeBarberListingCard({
  barber,
  salonCover,
}: {
  barber: BarberDiscovery;
  /** Usta avatari bo‘lmasa — bog‘langan salon cover. */
  salonCover?: Pick<Salon, "coverUrl" | "coverSeed" | "category"> | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const avatar = resolveMediaUrl(barber.avatar) ?? "";
  const showAvatar = Boolean(avatar) && !imgFailed;
  const meta = [
    barber.salonName || "",
    barber.distanceKm > 0 ? `${barber.distanceKm} km` : "",
    ...barber.servicesPreview.slice(0, 2),
  ];

  return (
    <Link
      to="/barber/$barberId"
      params={{ barberId: barber.barberId }}
      preload="intent"
      className="group block active:opacity-95"
    >
      <ListingMediaShell favoriteSalonId={barber.salonId}>
        {showAvatar ? (
          <img
            src={avatar}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 size-full object-cover transition duration-700 group-active:scale-[1.02]"
          />
        ) : salonCover ? (
          <SalonCoverImg
            src={salonCover.coverUrl}
            seed={salonCover.coverSeed}
            category={salonCover.category}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition duration-700 group-active:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-neutral-200">
            <User className="size-12 text-neutral-400" strokeWidth={1.25} />
          </div>
        )}
      </ListingMediaShell>
      <ListingBody
        title={barber.name}
        rating={barber.rating}
        reviewCount={barber.reviewCount}
        meta={meta}
        priceFrom={barber.priceFrom}
      />
    </Link>
  );
}

export function resolveBarberSalonCover(
  barber: BarberDiscovery,
  salonById: Map<string, Salon>,
): Pick<Salon, "coverUrl" | "coverSeed" | "category"> | null {
  if (!barber.salonId) return null;
  const salon = salonById.get(barber.salonId);
  if (!salon) return null;
  return {
    coverUrl: salon.coverUrl,
    coverSeed: salon.coverSeed,
    category: salon.category as Category,
  };
}
