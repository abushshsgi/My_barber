import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  ChevronRight,
  MapPin,
  Star,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SalonCoverImg } from "@/components/salon/SalonCoverImg";
import { HomeCategoryGrid } from "@/components/home/HomeCategoryGrid";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";
import type { HomeDiscoveryItem } from "@/lib/home-discovery";
import { filterTopSalons } from "@/lib/salon-top";
import { shortPrice, type Salon } from "@/lib/mock-data";
import { prefetchSalonDetail } from "@/lib/prefetch-salon";
import { cn } from "@/lib/utils";

/** Snap carousel — touch-pan-x yo'q (vertikal scrollni buzmasin). */
const H_SNAP =
  "no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 [-webkit-overflow-scrolling:touch]";

const SLIDE = "w-[min(86vw,22rem)] shrink-0 snap-center";

/** Faqat opacity — transform sticky/scrollni buzmasin. */
const fadeUp = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.01 } },
};

export function MotionSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section variants={fadeUp} className={className}>
      {children}
    </motion.section>
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
    <div className="mb-3 flex items-center justify-between gap-3 px-4">
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      {to && linkLabel ? (
        <Link to={to} className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
          {linkLabel}
          <ChevronRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

/** Katta salon kartochka — faqat rasm + nom. */
function HomeMobileSalonSlide({ salon }: { salon: Salon }) {
  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      preload="intent"
      onPointerEnter={() => prefetchSalonDetail(salon.id)}
      onTouchStart={() => prefetchSalonDetail(salon.id)}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted active:opacity-95"
    >
      <SalonCoverImg
        src={salon.coverUrl}
        seed={salon.coverSeed}
        category={salon.category}
        alt=""
        loading="lazy"
        className="absolute inset-0 size-full object-cover transition duration-500 group-active:scale-[1.02]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="truncate text-lg font-bold text-white drop-shadow-sm">{salon.name}</h3>
      </div>
    </Link>
  );
}

function HomeMixedBarberCard({ item }: { item: Extract<HomeDiscoveryItem, { type: "barber" }> }) {
  const { t } = useTranslation();
  const barber = item.barber;
  const bookTo =
    barber.bookingKind === "salon" && barber.salonId
      ? `/booking/${barber.salonId}?barber=${barber.barberId}`
      : `/booking/barber/${barber.barberId}`;

  return (
    <div className={cn(SLIDE, "flex flex-col")}>
      <Link
        to="/barber/$barberId"
        params={{ barberId: barber.barberId }}
        preload="intent"
        className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted active:opacity-95"
      >
        <div className="absolute inset-0">
          {barber.avatar ? (
            <img src={barber.avatar} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="grid size-full place-items-center bg-muted">
              <User className="size-10 text-muted-foreground/60" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="truncate text-lg font-bold text-white">{barber.name}</p>
        </div>
      </Link>
      <Link
        to={bookTo}
        className="mt-2 rounded-xl bg-foreground px-3 py-2.5 text-center text-xs font-bold text-background active:opacity-90"
      >
        {t("map.bookBarber", { defaultValue: "Bron qilish" })}
      </Link>
    </div>
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
            <HomeMobileSalonSlide salon={salon} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeMobileMixedDiscovery({ items }: { items: HomeDiscoveryItem[] }) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <section className="min-w-0">
      <SectionHead
        title={t("home.mixedDiscovery.title", { defaultValue: "Salonlar va ustalar" })}
        to="/map"
        linkLabel={t("common.viewMap")}
      />
      <div className={H_SNAP}>
        {items.map((item) =>
          item.type === "salon" ? (
            <div key={`s-${item.salon.id}`} className={SLIDE}>
              <HomeMobileSalonSlide salon={item.salon} />
            </div>
          ) : (
            <HomeMixedBarberCard key={`b-${item.barber.id}`} item={item} />
          ),
        )}
      </div>
    </section>
  );
}

export function HomeMobileCategories() {
  return <HomeCategoryGrid className="px-4" variant="rows" />;
}

/** Yaqin salonlar — katta vertikal kartochkalar. */
function HomeSalonCard({ salon }: { salon: Salon }) {
  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      preload="intent"
      onPointerEnter={() => prefetchSalonDetail(salon.id)}
      onTouchStart={() => prefetchSalonDetail(salon.id)}
      className="group block overflow-hidden rounded-2xl bg-muted active:opacity-95"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <SalonCoverImg
          src={salon.coverUrl}
          seed={salon.coverSeed}
          category={salon.category}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition duration-500 group-active:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5">
          <h3 className="min-w-0 truncate text-base font-bold text-white">{salon.name}</h3>
          {salon.rating > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-white">
              <Star className="size-3.5 fill-white text-white" />
              {salon.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          {salon.address}
        </p>
        <span className="shrink-0 text-xs font-semibold">dan {shortPrice(salon.priceFrom)}</span>
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight">{t("home.nearby")}</h2>
        <Link to="/map" className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
          {t("common.viewMap")}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <ul className="space-y-3">
        {salons.map((salon) => (
          <li key={salon.id}>
            <HomeSalonCard salon={salon} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeMobileBookingsCta() {
  const { t } = useTranslation();

  return (
    <Link
      to="/bookings"
      preload="intent"
      className="mx-4 flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 active:bg-surface"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background">
        <CalendarCheck className="size-4" strokeWidth={2.1} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t("nav.bookings")}</p>
        <p className="text-[11px] text-muted-foreground">
          {t("bookings.emptyHint", { defaultValue: "Bronlaringizni boshqaring" })}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** @deprecated — home hero olib tashlandi. */
export function HomeMobileHero(_props: Record<string, unknown>) {
  return null;
}

/** @deprecated — quick actions olib tashlandi. */
export function HomeMobileQuickActions() {
  return null;
}

/** @deprecated Map teaser olib tashlandi. */
export function HomeMobileMapTeaser({ count }: { count: number }) {
  void count;
  return null;
}

export { stagger, fadeUp };
