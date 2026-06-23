import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { getCategoryCoverUrl } from "@/lib/cover-images";
import type { Category, Salon } from "@/lib/mock-data";
import { BazaarMapPanel } from "./BazaarMapPanel";

type SectionProps = {
  title: string;
  subtitle?: string;
  viewAllTo?: string;
  viewAllLabel?: string;
  onViewAll?: () => void;
  children: React.ReactNode;
  className?: string;
};

function BazaarDiscoverySection({
  title,
  subtitle,
  viewAllTo,
  viewAllLabel,
  onViewAll,
  children,
  className,
}: SectionProps) {
  const { t } = useTranslation();
  const label = viewAllLabel ?? t("common.viewAll");

  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight xl:text-2xl">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {viewAllTo ? (
          <Link
            to={viewAllTo}
            className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-foreground transition hover:text-foreground/80"
          >
            {label}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-foreground transition hover:text-foreground/80"
          >
            {label}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">{children}</div>
    </section>
  );
}

type DealsProps = {
  salons: Salon[];
};

export function BazaarWeekendDeals({ salons }: DealsProps) {
  const { t } = useTranslation();
  if (salons.length === 0) return null;

  return (
    <BazaarDiscoverySection
      title={t("home.discovery.weekendDeals.title")}
      subtitle={t("home.discovery.weekendDeals.subtitle")}
      viewAllTo="/today"
    >
      {salons.map((salon) => (
        <div key={salon.id} className="w-[240px] shrink-0">
          <DesktopSalonCard salon={salon} variant="marketplace" />
        </div>
      ))}
    </BazaarDiscoverySection>
  );
}

type CategoryProps = {
  categories: Array<Category | "all">;
  onSelect: (cat: Category | "all") => void;
  onViewAll: () => void;
};

export function BazaarCategoryBrowse({ categories, onSelect, onViewAll }: CategoryProps) {
  const { t } = useTranslation();
  const keys = categories.filter((k): k is Category => k !== "all");
  if (keys.length === 0) return null;

  return (
    <BazaarDiscoverySection
      title={t("home.discovery.browseCategories.title")}
      onViewAll={onViewAll}
    >
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className="group w-[168px] shrink-0 text-left"
        >
          <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
            <img
              src={getCategoryCoverUrl(key, 560)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
          <p className="mt-2.5 text-[15px] font-semibold">{t(`home.categories.${key}`)}</p>
        </button>
      ))}
    </BazaarDiscoverySection>
  );
}

type MapRailProps = {
  salons: Parameters<typeof BazaarMapPanel>[0]["salons"];
  salonCount: number;
};

export function BazaarMapRail({ salons, salonCount }: MapRailProps) {
  const { t } = useTranslation();

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight xl:text-2xl">
            {t("home.discovery.mapSection.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("home.discovery.mapSection.subtitle", { count: salonCount })}
          </p>
        </div>
        <Link
          to="/map"
          className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-foreground transition hover:text-foreground/80"
        >
          {t("home.mapPreview.openMap")}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="relative aspect-[21/9] w-full max-h-[300px] overflow-hidden rounded-2xl">
        <BazaarMapPanel
          salons={salons}
          salonCount={salonCount}
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </section>
  );
}
