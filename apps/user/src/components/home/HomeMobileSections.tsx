import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  ChevronRight,
  Compass,
  Map,
  MapPin,
  Search,
  Star,
  Tag,
  User,
  Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { MobileSalonCard } from "@/components/mobile/MobileSalonCard";
import { SalonCoverImg } from "@/components/salon/SalonCoverImg";
import { HomeCategoryGrid } from "@/components/home/HomeCategoryGrid";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";
import type { HomeData } from "@/components/home/useHomeData";
import type { HomeDiscoveryItem } from "@/lib/home-discovery";
import { filterTopSalons } from "@/lib/salon-top";
import { shortPrice, type Salon } from "@/lib/mock-data";
import { prefetchSalonDetail } from "@/lib/prefetch-salon";
import { useDisplayUser } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

const H_SCROLL =
  "no-scrollbar touch-pan-x overscroll-x-contain overflow-x-auto [-webkit-overflow-scrolling:touch]";

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

function greetingLabel(firstName: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return firstName ? `Xayrli tong, ${firstName}` : "Xayrli tong";
  if (hour < 18) return firstName ? `Salom, ${firstName}` : "Salom";
  return firstName ? `Xayrli kech, ${firstName}` : "Xayrli kech";
}

const QUICK_ACTIONS = [
  { to: "/map", icon: Map, labelKey: "nav.map" },
  { to: "/ai-style", icon: Wand2, labelKey: "nav.aiStyle" },
  { to: "/offers", icon: Tag, labelKey: "nav.offers" },
  { to: "/explore", icon: Compass, labelKey: "nav.explore" },
] as const;

type SearchProps = Pick<
  HomeData,
  "query" | "setQuery" | "visibleCategoryKeys" | "effectiveCat" | "setCat"
>;

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
    <div className="mb-2.5 flex items-center justify-between gap-3 px-4">
      <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      {to && linkLabel ? (
        <Link to={to} className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
          {linkLabel}
          <ChevronRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function HomeMobileHero({ query, setQuery, visibleCategoryKeys, effectiveCat, setCat }: SearchProps) {
  const { t } = useTranslation();
  const { firstName } = useDisplayUser();

  return (
    <div className="min-w-0 overflow-x-clip px-4">
      <p className="text-[11px] font-medium text-muted-foreground">{greetingLabel(firstName)}</p>
      <h1 className="mt-0.5 text-lg font-bold leading-tight tracking-tight">{t("home.title")}</h1>

      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.search")}
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
        />
      </div>

      <div className="mt-2.5">
        <AudienceSwitch variant="compact" showProfileHint={false} />
      </div>

      <div className={cn(H_SCROLL, "mt-2.5 flex gap-1.5 pb-0.5")}>
        {visibleCategoryKeys.map((key) => {
          const active = effectiveCat === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCat(key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors active:scale-95",
                active ? "bg-foreground text-background" : "bg-surface text-foreground",
              )}
            >
              {t(`home.categories.${key}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HomeMobileQuickActions() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-4 gap-2 px-4">
      {QUICK_ACTIONS.map(({ to, icon: Icon, labelKey }) => (
        <Link
          key={to}
          to={to}
          preload="intent"
          className="flex flex-col items-center gap-1.5 rounded-xl py-2 active:scale-[0.97]"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-surface">
            <Icon className="size-4" strokeWidth={2.1} />
          </span>
          <span className="truncate text-[10px] font-semibold">{t(labelKey)}</span>
        </Link>
      ))}
    </div>
  );
}

/** @deprecated Map teaser olib tashlandi — quick actions yetarli. */
export function HomeMobileMapTeaser({ count }: { count: number }) {
  void count;
  return null;
}

export function HomeMobileFeatured({ salons }: { salons: Salon[] }) {
  const { t } = useTranslation();
  const featured = filterTopSalons(salons).slice(0, 6);
  const preview = featured.length > 0 ? featured : salons.slice(0, 6);
  if (preview.length === 0) return null;

  return (
    <section className="min-w-0 overflow-x-clip">
      <SectionHead title={t("home.topSalons.title")} to="/top" linkLabel={t("common.viewAll")} />
      <div className={cn(H_SCROLL, "flex gap-2.5 px-4 pb-1")}>
        {preview.map((salon) => (
          <div key={salon.id} className="w-[140px] shrink-0">
            <MobileSalonCard salon={salon} layout="vertical" />
          </div>
        ))}
      </div>
    </section>
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
    <div className="flex w-[140px] shrink-0 flex-col">
      <Link
        to="/barber/$barberId"
        params={{ barberId: barber.barberId }}
        preload="intent"
        className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-muted active:scale-[0.98]"
      >
        <div className="absolute inset-0">
          {barber.avatar ? (
            <img src={barber.avatar} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="grid size-full place-items-center bg-muted">
              <User className="size-8 text-muted-foreground/60" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute inset-x-2 bottom-2">
          <p className="truncate text-xs font-bold text-white">{barber.name}</p>
          <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-white/90">
            {barber.rating > 0 ? (
              <span className="inline-flex items-center gap-0.5 font-semibold">
                <Star className="size-3 fill-gold text-gold" />
                {barber.rating.toFixed(1)}
              </span>
            ) : (
              <span />
            )}
            {barber.priceFrom > 0 ? <span className="font-bold">{shortPrice(barber.priceFrom)}</span> : null}
          </div>
        </div>
      </Link>
      <Link
        to={bookTo}
        className="mt-1.5 rounded-xl bg-surface px-2 py-2 text-center text-[10px] font-bold text-foreground active:bg-muted"
      >
        {t("map.bookBarber", { defaultValue: "Bron qilish" })}
      </Link>
    </div>
  );
}

export function HomeMobileMixedDiscovery({ items }: { items: HomeDiscoveryItem[] }) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <section className="min-w-0 overflow-x-clip">
      <SectionHead
        title={t("home.mixedDiscovery.title", { defaultValue: "Salonlar va ustalar" })}
        to="/map"
        linkLabel={t("common.viewMap")}
      />
      <div className={cn(H_SCROLL, "flex gap-2.5 px-4 pb-1")}>
        {items.map((item) =>
          item.type === "salon" ? (
            <div key={`s-${item.salon.id}`} className="w-[140px] shrink-0">
              <MobileSalonCard salon={item.salon} layout="vertical" />
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
  return <HomeCategoryGrid className="px-4" compact />;
}

function HomeSalonRow({ salon }: { salon: Salon }) {
  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      preload="intent"
      onPointerEnter={() => prefetchSalonDetail(salon.id)}
      onTouchStart={() => prefetchSalonDetail(salon.id)}
      className="flex gap-2.5 py-2 active:opacity-80"
    >
      <SalonCoverImg
        src={salon.coverUrl}
        seed={salon.coverSeed}
        category={salon.category}
        alt=""
        loading="lazy"
        className="size-14 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold">{salon.name}</h3>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold">
            <Star className="size-3 fill-foreground" />
            {salon.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          {salon.address}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">{salon.distanceKm} km</span>
          <span className="text-xs font-semibold">dan {shortPrice(salon.priceFrom)}</span>
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
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold tracking-tight">{t("home.nearby")}</h2>
        <Link to="/map" className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
          {t("common.viewMap")}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {salons.map((salon) => (
          <li key={salon.id}>
            <HomeSalonRow salon={salon} />
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

export { stagger, fadeUp };
