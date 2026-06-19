import { Sparkles, Scissors, Flower2, Droplets, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Category } from "@/lib/mock-data";
import type { HomeData } from "@/components/home/useHomeData";
import { cn } from "@/lib/utils";

const ICONS: Record<Category | "all", React.ComponentType<{ className?: string }>> = {
  all: LayoutGrid,
  barber: Scissors,
  beauty: Sparkles,
  nails: Flower2,
  spa: Droplets,
};

type Props = Pick<HomeData, "effectiveCat" | "visibleCategoryKeys" | "setCat">;

export function MarketplaceCategoryBar({ effectiveCat, visibleCategoryKeys, setCat }: Props) {
  const { t } = useTranslation();
  const keys = visibleCategoryKeys;

  return (
    <div className="border-b border-border/80">
      <div className="no-scrollbar flex gap-1 overflow-x-auto pb-px">
        {keys.map((key) => {
          const Icon = ICONS[key] ?? LayoutGrid;
          const active = effectiveCat === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCat(key)}
              className={cn(
                "group relative flex shrink-0 flex-col items-center gap-1.5 px-4 pb-3 pt-1 transition-opacity hover:opacity-80",
                active ? "opacity-100" : "opacity-60",
              )}
            >
              <Icon className={cn("h-6 w-6", active && "stroke-[2.5px]")} strokeWidth={active ? 2.5 : 2} />
              <span className={cn("text-xs font-medium whitespace-nowrap", active && "font-bold")}>
                {t(`home.categories.${key}`)}
              </span>
              <span
                className={cn(
                  "absolute bottom-0 h-0.5 w-full rounded-full bg-foreground transition-opacity",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-30",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
