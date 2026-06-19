import { Search, MapPin, Scissors, CalendarDays, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { cn } from "@/lib/utils";

type Props = Pick<HomeData, "query" | "setQuery" | "effectiveCat" | "visibleCategoryKeys" | "setCat">;

export function MarketplaceHeroSearch({ query, setQuery, effectiveCat, visibleCategoryKeys, setCat }: Props) {
  const { t } = useTranslation();
  const activeCategory = effectiveCat === "all" ? visibleCategoryKeys[0] ?? "barber" : effectiveCat;

  return (
    <div className="relative mx-auto max-w-[850px]">
      <div className="flex flex-col overflow-hidden rounded-full border border-border bg-background shadow-[0_6px_20px_rgba(0,0,0,0.08)] sm:flex-row sm:items-stretch">
        <label className="group flex flex-1 cursor-text flex-col justify-center px-6 py-4 sm:border-r sm:border-border">
          <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">
            {t("common.search", { defaultValue: "Qidirish" })}
          </span>
          <div className="mt-0.5 flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("homePage.searchPlaceholder", { defaultValue: "Salon yoki xizmat nomi" })}
              className="w-full bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </label>

        <button
          type="button"
          onClick={() => {
            const idx = visibleCategoryKeys.indexOf(activeCategory);
            const next = visibleCategoryKeys[(idx + 1) % visibleCategoryKeys.length];
            if (next) setCat(next);
          }}
          className="flex flex-1 flex-col justify-center px-6 py-4 text-left sm:border-r sm:border-border hover:bg-surface/60"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">
            {t("homePage.serviceType", { defaultValue: "Xizmat turi" })}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-sm font-medium">
            <Scissors className="h-4 w-4 text-muted-foreground" />
            {t(`home.categories.${activeCategory}`, { defaultValue: activeCategory })}
          </span>
        </button>

        <div className="hidden flex-1 flex-col justify-center px-6 py-4 sm:flex sm:border-r sm:border-border">
          <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">
            {t("homePage.quick.today", { defaultValue: "Sana" })}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {t("homePage.anyDate", { defaultValue: "Istalgan sana" })}
          </span>
        </div>

        <div className="hidden flex-1 flex-col justify-center px-6 py-4 md:flex">
          <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">
            {t("homePage.audienceLabel", { defaultValue: "Kim uchun" })}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            {t("homePage.anyAudience", { defaultValue: "Hammasi" })}
          </span>
        </div>

        <div className="flex items-center p-2 sm:pl-0">
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-full bg-[#E61E4D] px-6 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] sm:w-auto sm:py-4",
            )}
          >
            <Search className="h-4 w-4" strokeWidth={2.5} />
            <span className="sm:hidden">{t("common.search")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
