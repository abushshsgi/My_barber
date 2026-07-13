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

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
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

function greetingLabel(firstName: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return firstName ? `Xayrli tong, ${firstName}` : "Xayrli tong";
  if (hour < 18) return firstName ? `Salom, ${firstName}` : "Salom";
  return firstName ? `Xayrli kech, ${firstName}` : "Xayrli kech";
}

const QUICK_SIDE = [
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
    <div className="mb-3 flex items-center justify-between gap-3 px-4">
      <h2 className="text-[15px] font-extrabold tracking-tight">{title}</h2>
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
    <div className="px-4">
      <div className="overflow-hidden rounded-[1.35rem] bg-foreground px-4 pb-4 pt-5 text-background">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/55">mysaloon.uz</p>
        <h1 className="mt-1.5 text-[1.55rem] font-extrabold leading-[1.15] tracking-tight">
          {greetingLabel(firstName)}
        </h1>
        <p className="mt-1 text-[13px] text-background/70">{t("home.title")}</p>

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("home.filters.title")}
            className="w-full rounded-2xl bg-background py-3.5 pl-10 pr-4 text-sm font-medium text-foreground shadow-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-background/40"
          />
        </div>

        <div className="mt-3">
          <AudienceSwitch variant="compact" showProfileHint={false} />
        </div>
      </div>

      <div className={cn(H_SCROLL, "mt-3 flex gap-2 pb-0.5")}>
        {visibleCategoryKeys.map((key) => {
          const active = effectiveCat === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCat(key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all active:scale-95",
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
    <div className="grid grid-cols-2 gap-2.5 px-4">
      <Link
        to="/map"
        preload="intent"
        className="relative flex min-h-[112px] flex-col justify-between overflow-hidden rounded-[1.25rem] bg-foreground p-3.5 text-background active:scale-[0.98]"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-background/15">
          <Map className="size-5" strokeWidth={2.1} />
        </span>
        <div>
          <p className="text-sm font-extrabold">{t("nav.map")}</p>
          <p className="mt-0.5 text-[11px] text-background/70">{t("common.viewMap")}</p>
        </div>
      </Link>

      <div className="grid grid-rows-3 gap-2">
        {QUICK_SIDE.map(({ to, icon: Icon, labelKey }) => (
          <Link
            key={to}
            to={to}
            preload="intent"
            className="flex items-center gap-2.5 rounded-2xl bg-surface px-3 py-2 active:scale-[0.98]"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground text-background">
              <Icon className="size-3.5" strokeWidth={2.2} />
            </span>
            <span className="truncate text-[11px] font-bold">{t(labelKey)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HomeMobileMapTeaser({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count <= 0) return null;

  return (
    <Link
      to="/map"
      preload="intent"
      className="mx-4 flex items-stretch overflow-hidden rounded-[1.25rem] border border-border bg-surface active:scale-[0.99]"
    >
      <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 bg-foreground text-background">
        <MapPin className="size-5" strokeWidth={2.1} />
        <span className="text-[10px] font-bold">{count}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3.5 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{t("home.mapPreview.explore")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("home.mapPreview.nearbyCount", { count })}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
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
    <section>
      <SectionHead title={t("home.topSalons.title")} to="/top" linkLabel={t("common.viewAll")} />
      <div className={cn(H_SCROLL, "flex gap-3 px-4 pb-1")}>
        {preview.map((salon) => (
          <div key={salon.id} className="w-[158px] shrink-0 sm:w-[188px]">
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
    <div className="flex w-[158px] shrink-0 flex-col sm:w-[188px] lg:w-[220px]">
      <Link
        to="/barber/$barberId"
        params={{ barberId: barber.barberId }}
        preload="intent"
        className="group relative block aspect-[3/4] overflow-hidden rounded-3xl bg-muted active:scale-[0.98]"
      >
        <div className="absolute inset-0">
          {barber.avatar ? (
            <img src={barber.avatar} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-muted to-muted-foreground/20">
              <User className="size-10 text-muted-foreground/60" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-bold text-foreground">
          {t("map.tabBarbers", { defaultValue: "Usta" })}
        </span>
        <div className="absolute inset-x-2.5 bottom-2.5">
          <p className="truncate text-sm font-bold text-white">{barber.name}</p>
          {barber.salonName ? (
            <p className="mt-0.5 truncate text-[11px] text-white/75">{barber.salonName}</p>
          ) : null}
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
            {barber.rating > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-white">
                <Star className="size-3.5 fill-gold text-gold" />
                {barber.rating.toFixed(1)}
              </span>
            ) : (
              <span />
            )}
            {barber.priceFrom > 0 ? (
              <span className="font-bold text-white/90">{shortPrice(barber.priceFrom)}</span>
            ) : null}
          </div>
        </div>
      </Link>
      <Link
        to={bookTo}
        className="mt-2 rounded-2xl bg-foreground/5 px-3 py-2.5 text-center text-[11px] font-bold text-foreground active:bg-foreground/10"
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
    <section className="min-w-0">
      <SectionHead
        title={t("home.mixedDiscovery.title", { defaultValue: "Salonlar va ustalar" })}
        to="/map"
        linkLabel={t("common.viewMap")}
      />
      <div className={cn(H_SCROLL, "flex gap-3 px-4 pb-1")}>
        {items.map((item) =>
          item.type === "salon" ? (
            <div key={`s-${item.salon.id}`} className="w-[158px] shrink-0 sm:w-[188px] lg:w-[220px]">
              <MobileSalonCard salon={item.salon} layout="vertical" variant="glass" />
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
      className="flex gap-3 rounded-2xl bg-surface p-2.5 active:scale-[0.99]"
    >
      <SalonCoverImg
        src={salon.coverUrl}
        seed={salon.coverSeed}
        category={salon.category}
        alt=""
        loading="lazy"
        className="size-[72px] shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-bold">{salon.name}</h3>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold">
            <Star className="size-3 fill-foreground" />
            {salon.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          {salon.address}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">{salon.distanceKm} km</span>
          <span className="text-xs font-bold">dan {shortPrice(salon.priceFrom)}</span>
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold tracking-tight">{t("home.nearby")}</h2>
        <Link to="/map" className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
          {t("common.viewMap")}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <ul className="space-y-2">
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
      className="mx-4 flex items-center gap-3 rounded-[1.25rem] border border-border bg-surface px-4 py-3.5 active:scale-[0.99]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
        <CalendarCheck className="size-[18px]" strokeWidth={2.1} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{t("nav.bookings")}</p>
        <p className="text-xs text-muted-foreground">
          {t("bookings.emptyHint", { defaultValue: "Bronlaringizni boshqaring" })}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export { stagger, fadeUp };
