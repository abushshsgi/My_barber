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
import type { HomeData } from "@/components/home/useHomeData";
import { getCategoryCoverUrl } from "@/lib/cover-images";
import { HOME_CATEGORY_KEYS } from "@/lib/home-sections";
import type { HomeDiscoveryItem } from "@/lib/home-discovery";
import { filterTopSalons } from "@/lib/salon-top";
import { shortPrice, type Category, type Salon } from "@/lib/mock-data";
import { prefetchSalonDetail } from "@/lib/prefetch-salon";
import { useDisplayUser } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.03 } },
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

export function HomeMobileHero({ query, setQuery, visibleCategoryKeys, effectiveCat, setCat }: SearchProps) {
  const { t } = useTranslation();
  const { firstName } = useDisplayUser();

  return (
    <div className="px-4 pt-2">
      <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight">{greetingLabel(firstName)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("home.title")}</p>

      <div className="relative mt-4">
        <Search className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("home.filters.title")}
          className="w-full rounded-2xl bg-surface py-3.5 pl-11 pr-4 text-sm font-medium shadow-soft placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
        />
      </div>

      <div className="mt-3">
        <AudienceSwitch variant="compact" showProfileHint={false} />
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-0.5">
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
    <div className="grid grid-cols-4 gap-2 px-4">
      {QUICK_ACTIONS.map(({ to, icon: Icon, labelKey }) => (
        <Link
          key={to}
          to={to}
          preload="intent"
          className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface px-2 py-3 active:scale-95"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
            <Icon className="size-[18px]" strokeWidth={2.1} />
          </span>
          <span className="text-center text-[10px] font-semibold leading-tight">{t(labelKey)}</span>
        </Link>
      ))}
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
      className="mx-4 flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3.5 text-background active:scale-[0.99]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-background/15">
        <Map className="size-5" strokeWidth={2.1} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{t("home.mapPreview.explore")}</p>
        <p className="text-xs text-background/75">
          {t("home.mapPreview.nearbyCount", { count })}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-background/80" />
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
      <div className="mb-3 flex items-center justify-between gap-3 px-4">
        <h2 className="text-base font-bold">{t("home.topSalons.title")}</h2>
        <Link to="/top" className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
          {t("common.viewAll")}
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {preview.map((salon) => (
          <div key={salon.id} className="w-[168px] shrink-0">
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
    <div className="flex w-[168px] shrink-0 flex-col rounded-2xl bg-surface p-3">
      <Link to="/barber/$barberId" params={{ barberId: barber.barberId }} preload="intent" className="min-w-0">
        <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          {barber.avatar ? (
            <img src={barber.avatar} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="grid size-full place-items-center">
              <User className="size-8 text-muted-foreground" />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
            {t("map.tabBarbers", { defaultValue: "Usta" })}
          </span>
        </div>
        <p className="truncate text-sm font-bold">{barber.name}</p>
        {barber.salonName ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{barber.salonName}</p>
        ) : null}
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
          {barber.rating > 0 ? (
            <span className="inline-flex items-center gap-0.5 font-semibold">
              <Star className="size-3 fill-foreground" />
              {barber.rating.toFixed(1)}
            </span>
          ) : (
            <span />
          )}
          {barber.priceFrom > 0 ? <span className="font-bold">{shortPrice(barber.priceFrom)}</span> : null}
        </div>
      </Link>
      <Link
        to={bookTo}
        className="mt-2 rounded-xl bg-foreground px-3 py-2 text-center text-[11px] font-bold text-background"
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
    <section>
      <div className="mb-3 flex items-center justify-between gap-3 px-4">
        <h2 className="text-base font-bold">
          {t("home.mixedDiscovery.title", { defaultValue: "Salonlar va ustalar" })}
        </h2>
        <Link to="/map" className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
          {t("common.viewMap")}
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {items.map((item) =>
          item.type === "salon" ? (
            <div key={`s-${item.salon.id}`} className="w-[168px] shrink-0">
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

function CategoryTile({ category, label }: { category: Category; label: string }) {
  return (
    <Link
      to="/category/$category"
      params={{ category }}
      preload="intent"
      className="group relative aspect-[5/4] overflow-hidden rounded-2xl bg-surface active:scale-[0.98]"
    >
      <img
        src={getCategoryCoverUrl(category, 480)}
        alt=""
        loading="lazy"
        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-active:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <p className="absolute bottom-3 left-3 right-3 text-sm font-bold text-white">{label}</p>
    </Link>
  );
}

export function HomeMobileCategories() {
  const { t } = useTranslation();

  return (
    <section className="px-4">
      <h2 className="mb-3 text-base font-bold">{t("home.sections.browseCategories")}</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {HOME_CATEGORY_KEYS.map((category) => (
          <CategoryTile key={category} category={category} label={t(`home.categories.${category}`)} />
        ))}
      </div>
    </section>
  );
}

function HomeSalonRow({ salon }: { salon: Salon }) {
  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      preload="intent"
      onPointerEnter={() => prefetchSalonDetail(salon.id)}
      onTouchStart={() => prefetchSalonDetail(salon.id)}
      className="flex gap-3 rounded-2xl bg-surface p-3 active:scale-[0.99]"
    >
      <SalonCoverImg
        src={salon.coverUrl}
        seed={salon.coverSeed}
        category={salon.category}
        alt=""
        loading="lazy"
        className="size-[76px] shrink-0 rounded-xl object-cover"
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
        <div className="mt-2 flex items-center justify-between gap-2">
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
        <p className="rounded-2xl bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
          {t("homePage.emptyTitle")}
        </p>
      </section>
    );
  }

  return (
    <section className="px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">{t("home.nearby")}</h2>
        <Link to="/map" className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
          {t("common.viewMap")}
          <ChevronRight className="size-4" />
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
      className="mx-4 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 active:scale-[0.99]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
        <CalendarCheck className="size-[18px]" strokeWidth={2.1} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{t("nav.bookings")}</p>
        <p className="text-xs text-muted-foreground">{t("bookings.emptyHint", { defaultValue: "Bronlaringizni boshqaring" })}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export { stagger, fadeUp };
