import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, Hand, Heart, Map, Scissors, Sparkles, Star, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { CatalogScopeSelect } from "@/components/home/CatalogScopeSelect";
import type { CatalogScopeValue } from "@/lib/catalog-scope";
import { SalonCoverImg } from "@/components/salon/SalonCoverImg";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";
import { useFavorites } from "@/hooks/use-favorites";
import { HOME_CATEGORY_KEYS } from "@/lib/home-sections";
import { filterTopSalons } from "@/lib/salon-top";
import type { BarberDiscovery } from "@/lib/mappers/barber";
import { resolveMediaUrl } from "@/lib/media-url";
import { shortPrice, type Category, type Salon } from "@/lib/mock-data";
import { prefetchSalonDetail } from "@/lib/prefetch-salon";
import { cn } from "@/lib/utils";

const H_SNAP =
  "no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-0.5 [-webkit-overflow-scrolling:touch]";

/** Carousel slide — rasmdagi keng listing kartochka. */
const SLIDE = "w-[min(85vw,21rem)] shrink-0 snap-center";

const CARD_RADIUS = "rounded-[1.5rem]";
const CARD_ASPECT = "aspect-[4/3]";

const CATEGORY_ICONS: Record<Category, typeof Scissors> = {
  barber: Scissors,
  beauty: Sparkles,
  nails: Hand,
};

const fadeUp = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

export function MotionSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section variants={fadeUp} className={className}>
      {children}
    </motion.section>
  );
}

export function HomeMobileWordmark({
  catalogScope,
  onCatalogScopeChange,
}: {
  catalogScope: CatalogScopeValue;
  onCatalogScopeChange: (value: CatalogScopeValue) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link to="/" className="shrink-0" aria-label="Mysaloon">
          <MysaloonLogo size="sm" />
        </Link>
        <CatalogScopeSelect
          compact
          value={catalogScope}
          onChange={onCatalogScopeChange}
          className="min-w-0 rounded-full bg-surface px-2.5 py-1.5"
        />
      </div>
      <Link
        to="/map"
        preload="intent"
        className="grid size-9 shrink-0 place-items-center rounded-full text-foreground active:bg-surface"
        aria-label="Xarita"
      >
        <Map className="size-[18px]" strokeWidth={2} />
      </Link>
    </div>
  );
}

function SectionHead({
  title,
  to,
  linkLabel,
}: {
  title: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-3 px-4">
      <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
      {to && linkLabel ? (
        <Link
          to={to}
          className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground"
        >
          {linkLabel}
          <ChevronRight className="size-3.5 opacity-70" />
        </Link>
      ) : null}
    </div>
  );
}

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
      className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.25)] backdrop-blur-md transition active:scale-95"
      aria-label="Sevimli"
    >
      <Heart
        className={cn("size-[17px]", fav ? "fill-foreground text-foreground" : "fill-transparent text-foreground")}
        strokeWidth={2}
      />
    </button>
  );
}

function ListingRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  if (rating <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] leading-none text-foreground">
      <Star className="size-3 fill-foreground" strokeWidth={0} />
      <span className="font-medium tabular-nums">{rating.toFixed(2)}</span>
      {reviewCount > 0 ? (
        <span className="font-normal text-foreground/80">({reviewCount})</span>
      ) : null}
    </span>
  );
}

function ListingMeta({ parts }: { parts: string[] }) {
  const clean = parts.map((p) => p.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  return (
    <p className="mt-0.5 truncate text-[12px] leading-snug text-muted-foreground">
      {clean.join(" · ")}
    </p>
  );
}

function ListingPrice({
  priceFrom,
  priceTo,
  suffix,
}: {
  priceFrom: number;
  priceTo?: number;
  suffix: string;
}) {
  if (priceFrom <= 0) return null;
  const showStrike = typeof priceTo === "number" && priceTo > priceFrom;
  return (
    <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[13px] leading-snug">
      {showStrike ? (
        <span className="text-muted-foreground line-through decoration-muted-foreground/80">
          {shortPrice(priceTo)}
        </span>
      ) : null}
      <span>
        <span className="font-semibold text-foreground">{shortPrice(priceFrom)}</span>
        <span className="font-normal text-foreground"> {suffix}</span>
      </span>
    </p>
  );
}

/** Airbnb-uslubidagi salon listing — barcha Home kartalar bir xil. */
function SalonListingCard({ salon }: { salon: Salon }) {
  const { t } = useTranslation();
  const categoryLabel = t(`home.categories.${salon.category}`);
  const meta = [
    categoryLabel,
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
      <div className={cn("relative overflow-hidden bg-muted", CARD_ASPECT, CARD_RADIUS)}>
        <SalonCoverImg
          src={salon.coverUrl}
          seed={salon.coverSeed}
          category={salon.category}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition duration-700 group-active:scale-[1.02]"
        />
        <FavHeartButton salonId={salon.id} />
      </div>
      <div className="mt-2.5 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight text-foreground">
            {salon.name}
          </h3>
          <ListingRating rating={salon.rating} reviewCount={salon.reviewCount} />
        </div>
        <ListingMeta parts={meta} />
        <ListingPrice
          priceFrom={salon.priceFrom}
          priceTo={salon.priceTo}
          suffix={t("map.priceFromSuffix", { defaultValue: "dan" })}
        />
      </div>
    </Link>
  );
}

function FeaturedSlide({ salon }: { salon: Salon }) {
  return <SalonListingCard salon={salon} />;
}

export function HomeMobileFeatured({ salons }: { salons: Salon[] }) {
  const { t } = useTranslation();
  const featured = filterTopSalons(salons).slice(0, 6);
  const preview = featured.length > 0 ? featured : salons.slice(0, 6);
  if (preview.length === 0) return null;

  return (
    <section className="min-w-0">
      <SectionHead title={t("home.topSalons.title")} to="/top" linkLabel={t("common.viewAll")} />
      <div className={H_SNAP}>
        {preview.map((salon) => (
          <div key={salon.id} className={SLIDE}>
            <FeaturedSlide salon={salon} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Top usta — salon kartochkasi bilan bir xil listing. */
function FeaturedBarberSlide({ barber }: { barber: BarberDiscovery }) {
  const { t } = useTranslation();
  const [imgFailed, setImgFailed] = useState(false);
  const avatar = resolveMediaUrl(barber.avatar) ?? "";
  const showPhoto = Boolean(avatar) && !imgFailed;
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
      <div className={cn("relative overflow-hidden bg-muted", CARD_ASPECT, CARD_RADIUS)}>
        {showPhoto ? (
          <img
            src={avatar}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 size-full object-cover transition duration-700 group-active:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-muted">
            <User className="size-10 text-muted-foreground/50" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight text-foreground">
            {barber.name}
          </h3>
          <ListingRating rating={barber.rating} reviewCount={barber.reviewCount} />
        </div>
        <ListingMeta parts={meta} />
        <ListingPrice
          priceFrom={barber.priceFrom}
          suffix={t("map.priceFromSuffix", { defaultValue: "dan" })}
        />
      </div>
    </Link>
  );
}

export function HomeMobileFeaturedBarbers({ barbers }: { barbers: BarberDiscovery[] }) {
  const { t } = useTranslation();
  const withPhoto = barbers.filter((b) => Boolean(b.avatar?.trim()));
  const preview = (withPhoto.length > 0 ? withPhoto : barbers).slice(0, 8);
  if (preview.length === 0) return null;

  return (
    <section className="min-w-0">
      <SectionHead
        title={t("home.topBarbers.title")}
        to="/map"
        linkLabel={t("common.viewAll")}
      />
      <div className={H_SNAP}>
        {preview.map((barber) => (
          <div key={barber.id} className={SLIDE}>
            <FeaturedBarberSlide barber={barber} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Kategoriya — ikonkali pillalar. */
export function HomeMobileCategories() {
  const { t } = useTranslation();

  return (
    <div className="px-4">
      <div className="flex gap-2">
        {HOME_CATEGORY_KEYS.map((category) => {
          const Icon = CATEGORY_ICONS[category];
          return (
            <Link
              key={category}
              to="/category/$category"
              params={{ category }}
              preload="intent"
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border/80 bg-background py-2.5",
                "text-[12px] font-semibold tracking-tight text-foreground transition",
                "active:bg-foreground active:text-background",
              )}
            >
              <Icon className="size-3.5 shrink-0" strokeWidth={2.2} />
              {t(`home.categories.${category}`)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Yaqin salonlar — bir xil listing (to‘liq kenglik). */
function NearbyCard({ salon }: { salon: Salon }) {
  return <SalonListingCard salon={salon} />;
}

export function HomeMobileNearby({
  salons,
  title,
}: {
  salons: Salon[];
  title?: string;
}) {
  const { t } = useTranslation();
  const heading = title || t("home.nearby");

  if (salons.length === 0) {
    return (
      <section className="px-4">
        <NoSalonsEmpty compact />
      </section>
    );
  }

  return (
    <section className="px-4">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">{heading}</h2>
        <Link to="/map" className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
          {t("common.viewMap")}
          <ChevronRight className="size-3.5 opacity-70" />
        </Link>
      </div>
      <ul className="space-y-7">
        {salons.map((salon) => (
          <li key={salon.id}>
            <NearbyCard salon={salon} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** @deprecated */
export function HomeMobileHero(_props: Record<string, unknown>) {
  return null;
}

/** @deprecated */
export function HomeMobileQuickActions() {
  return null;
}

/** @deprecated */
export function HomeMobileMapTeaser({ count }: { count: number }) {
  void count;
  return null;
}

/** @deprecated */
export function HomeMobileMixedDiscovery({ items }: { items: unknown[] }) {
  void items;
  return null;
}

/** @deprecated */
export function HomeMobileBookingsCta() {
  return null;
}

export { stagger, fadeUp };
