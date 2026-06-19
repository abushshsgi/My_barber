import { Link } from "@tanstack/react-router";
import { ChevronRight, Map as MapIcon, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { DesktopSearchBar } from "@/components/desktop/ui/DesktopSearchBar";
import { getHairstyleImageUrl, type TrendingHairstyle } from "@/lib/hairstyles/catalog";
import { cn } from "@/lib/utils";

type Props = { data: HomeData };

function FilterPanel({ data }: Props) {
  const { t } = useTranslation();
  return (
    <aside className="space-y-4 rounded-2xl border border-border bg-surface/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {t("home.categories.all", { defaultValue: "Filter" })}
      </p>
      <div className="flex flex-wrap gap-2">
        {data.visibleCategoryKeys.map((key) => {
          const active = data.effectiveCat === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => data.setCat(key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold",
                active ? "bg-foreground text-background" : "bg-background text-foreground",
              )}
            >
              {t(`home.categories.${key}`)}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function TrendingGrid({ trending }: { trending: TrendingHairstyle[] }) {
  const { t } = useTranslation();
  if (trending.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-lg font-bold">{t("homePage.quick.trends")}</h2>
        <Link to="/explore" className="flex items-center text-sm font-bold">
          {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {trending.slice(0, 5).map((s) => (
          <Link key={s.id} to="/explore/$styleId" params={{ styleId: s.id }}>
            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
              <img src={getHairstyleImageUrl({ imageUrl: s.imageUrl })} alt="" className="h-full w-full object-cover" />
            </div>
            <p className="mt-2 text-sm font-bold">{s.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HomeDesktopMarketplace({ data }: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("home.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("homePage.editorialTagline")}</p>
        </div>
        <DesktopSearchBar value={data.query} onChange={data.setQuery} className="max-w-md" large />
      </div>

      <div className="grid grid-cols-[280px_1fr_320px] gap-6">
        <FilterPanel data={data} />
        <div>
          <h2 className="mb-4 text-lg font-bold">
            {t(data.personalized ? "homePage.nearYou" : "homePage.pickedForYou")}
          </h2>
          {data.loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {data.filtered.slice(0, 9).map((s) => (
                <DesktopSalonCard key={s.id} salon={s} variant="grid" />
              ))}
            </div>
          )}
        </div>
        <aside className="space-y-4">
          <Link
            to="/map"
            className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-center transition-colors hover:bg-surface"
          >
            <MapIcon className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-bold">{t("common.viewMap")}</p>
          </Link>
          <Link
            to="/ai-style"
            className="block rounded-2xl border border-border bg-foreground p-5 text-background"
          >
            <Wand2 className="h-5 w-5" />
            <p className="mt-3 text-sm font-bold">{t("homePage.aiPromoTitle")}</p>
            <p className="mt-1 text-xs text-background/70">{t("homePage.aiPromoHint")}</p>
          </Link>
        </aside>
      </div>

      <TrendingGrid trending={data.trending} />
    </div>
  );
}
