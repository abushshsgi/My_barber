import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, Map as MapIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { CatalogScopeSelect } from "@/components/home/CatalogScopeSelect";
import {
  HomeBarberListingCard,
  HomeSalonListingCard,
  resolveBarberSalonCover,
} from "@/components/home/HomeListingCard";
import type { CatalogScopeValue } from "@/lib/catalog-scope";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";
import { HOME_CATEGORY_KEYS } from "@/lib/home-sections";
import { filterTopSalons } from "@/lib/salon-top";
import type { BarberDiscovery } from "@/lib/mappers/barber";
import type { Salon } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const H_SNAP =
  "no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-0.5 [-webkit-overflow-scrolling:touch]";

/** Carousel — UI kitdagi keng listing. */
const SLIDE = "w-[min(88vw,22rem)] shrink-0 snap-center";

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
        <MapIcon className="size-[18px]" strokeWidth={2} />
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
            <HomeSalonListingCard salon={salon} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Top usta — salon bilan bir xil UI kit listing. */
export function HomeMobileFeaturedBarbers({
  barbers,
  salons = [],
}: {
  barbers: BarberDiscovery[];
  salons?: Salon[];
}) {
  const { t } = useTranslation();
  const salonById = useMemo(() => new Map(salons.map((s) => [s.id, s])), [salons]);

  const preview = useMemo(() => {
    const scored = [...barbers].sort((a, b) => {
      const score = (x: BarberDiscovery) => {
        if (x.avatar?.trim()) return 2;
        if (x.salonId && salonById.get(x.salonId)?.coverUrl?.trim()) return 1;
        return 0;
      };
      return score(b) - score(a);
    });
    return scored.slice(0, 8);
  }, [barbers, salonById]);

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
            <HomeBarberListingCard
              barber={barber}
              salonCover={resolveBarberSalonCover(barber, salonById)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Kategoriya — UI kit filter chip’lar. */
export function HomeMobileCategories() {
  const { t } = useTranslation();

  return (
    <div className="px-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        <Link
          to="/"
          className="shrink-0 rounded-full bg-foreground px-4 py-2 text-[12px] font-semibold tracking-tight text-background"
        >
          {t("home.categories.all", { defaultValue: "Barchasi" })}
        </Link>
        {HOME_CATEGORY_KEYS.map((category) => (
          <Link
            key={category}
            to="/category/$category"
            params={{ category }}
            preload="intent"
            className={cn(
              "shrink-0 rounded-full border border-foreground/85 bg-background px-4 py-2",
              "text-[12px] font-semibold tracking-tight text-foreground transition",
              "active:bg-foreground active:text-background",
            )}
          >
            {t(`home.categories.${category}`)}
          </Link>
        ))}
      </div>
    </div>
  );
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
            <HomeSalonListingCard salon={salon} />
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
