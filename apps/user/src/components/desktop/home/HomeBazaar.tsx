import { Link } from "@tanstack/react-router";
import { Map, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { cn } from "@/lib/utils";

type Props = { data: HomeData };

/** Bazaar — chap filter + markaz grid + o'ng xarita */
export function HomeBazaar({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, loading, query, setQuery } = data;

  return (
    <div className="-mx-2">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{t("home.nearby")}</h1>
        <span className="rounded-full bg-[#059669]/10 px-3 py-1 text-sm font-semibold text-[#059669]">
          {filtered.length} ta
        </span>
      </div>

      <div className="grid grid-cols-[240px_1fr_280px] gap-6">
        <aside className="space-y-4">
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <SlidersHorizontal className="h-4 w-4" /> Filterlar
            </p>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("common.search")}
              className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <div className="mt-4 space-y-2">
              {data.visibleCategoryKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => data.setCat(key)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium",
                    data.effectiveCat === key ? "bg-[#059669] text-white" : "hover:bg-surface",
                  )}
                >
                  {t(`home.categories.${key}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Narx · Masofa · Reyting filterlari tez orada
          </div>
        </aside>

        <section>
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {filtered.map((salon) => (
                <DesktopSalonCard key={salon.id} salon={salon} variant="marketplace" />
              ))}
            </div>
          )}
        </section>

        <aside className="sticky top-28 h-fit space-y-4">
          <Link
            to="/map"
            className="flex h-56 flex-col items-center justify-center rounded-xl border-2 border-[#059669] bg-[#059669]/5 p-4 text-center transition-colors hover:bg-[#059669]/10"
          >
            <Map className="h-10 w-10 text-[#059669]" />
            <p className="mt-3 font-bold">{t("common.viewMap")}</p>
            <p className="mt-1 text-xs text-muted-foreground">Salonlarni xaritada ko'ring</p>
          </Link>
          <Link to="/today" className="block rounded-xl bg-[#059669] p-4 text-center text-sm font-bold text-white">
            {t("homePage.quick.today")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
