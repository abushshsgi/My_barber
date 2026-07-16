import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, Hand, Map, MapPin, Scissors, Sparkles, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { SalonCoverImg } from "@/components/salon/SalonCoverImg";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";
import { HOME_CATEGORY_KEYS } from "@/lib/home-sections";
import { filterTopSalons } from "@/lib/salon-top";
import { shortPrice, type Category, type Salon } from "@/lib/mock-data";
import { prefetchSalonDetail } from "@/lib/prefetch-salon";
import { cn } from "@/lib/utils";

const H_SNAP =
  "no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-0.5 [-webkit-overflow-scrolling:touch]";

const SLIDE = "w-[min(88vw,24rem)] shrink-0 snap-center";

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

export function HomeMobileWordmark() {
  return (
    <div className="flex items-center justify-between gap-3 px-4">
      <Link to="/" className="min-w-0" aria-label="Mysaloon">
        <MysaloonLogo size="sm" />
      </Link>
      <Link
        to="/map"
        preload="intent"
        className="grid size-9 place-items-center rounded-full text-foreground active:bg-surface"
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

/** Top salon — rasm + ostida nom (editorial). */
function FeaturedSlide({ salon }: { salon: Salon }) {
  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      preload="intent"
      onPointerEnter={() => prefetchSalonDetail(salon.id)}
      onTouchStart={() => prefetchSalonDetail(salon.id)}
      className="group block active:opacity-95"
    >
      <div className="relative aspect-[5/6] overflow-hidden rounded-[1.25rem] bg-muted shadow-[0_12px_36px_-18px_rgba(0,0,0,0.35)]">
        <SalonCoverImg
          src={salon.coverUrl}
          seed={salon.coverSeed}
          category={salon.category}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition duration-700 group-active:scale-[1.015]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        {salon.rating > 0 ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-sm backdrop-blur-sm">
            <Star className="size-3 fill-foreground" />
            {salon.rating.toFixed(1)}
          </span>
        ) : null}
        {salon.distanceKm > 0 ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <MapPin className="size-3" />
            {salon.distanceKm} km
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 px-0.5">
        <h3 className="truncate text-[15px] font-semibold tracking-tight">{salon.name}</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {salon.address ? <span className="truncate">{salon.address}</span> : null}
          {salon.priceFrom > 0 ? <span className="shrink-0">dan {shortPrice(salon.priceFrom)}</span> : null}
        </p>
      </div>
    </Link>
  );
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

/** Yaqin salonlar — toza feed. */
function NearbyCard({ salon }: { salon: Salon }) {
  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      preload="intent"
      onPointerEnter={() => prefetchSalonDetail(salon.id)}
      onTouchStart={() => prefetchSalonDetail(salon.id)}
      className="group block active:opacity-95"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.15rem] bg-muted">
        <SalonCoverImg
          src={salon.coverUrl}
          seed={salon.coverSeed}
          category={salon.category}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition duration-700 group-active:scale-[1.015]"
        />
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{salon.name}</h3>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{salon.address}</p>
        </div>
        <div className="shrink-0 text-right">
          {salon.rating > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold">
              <Star className="size-3 fill-foreground" />
              {salon.rating.toFixed(1)}
            </span>
          ) : null}
          {salon.priceFrom > 0 ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">dan {shortPrice(salon.priceFrom)}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function HomeMobileNearby({ salons }: { salons: Salon[] }) {
  const { t } = useTranslation();

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
        <h2 className="text-[15px] font-semibold tracking-tight">{t("home.nearby")}</h2>
        <Link to="/map" className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
          {t("common.viewMap")}
          <ChevronRight className="size-3.5 opacity-70" />
        </Link>
      </div>
      <ul className="space-y-6">
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
