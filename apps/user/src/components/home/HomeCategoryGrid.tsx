import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCategoryCoverUrl } from "@/lib/cover-images";
import { HOME_CATEGORY_KEYS } from "@/lib/home-sections";
import type { Category } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const CATEGORY_HINT_KEYS: Record<Category, string> = {
  barber: "home.categoriesHint.barber",
  beauty: "home.categoriesHint.beauty",
  nails: "home.categoriesHint.nails",
};

type Props = {
  className?: string;
  titleClassName?: string;
  compact?: boolean;
};

function CategoryGlassCard({
  category,
  label,
  hint,
  compact,
}: {
  category: Category;
  label: string;
  hint: string;
  compact?: boolean;
}) {
  return (
    <Link
      to="/category/$category"
      params={{ category }}
      preload="intent"
      className={cn(
        "group relative block min-w-0 overflow-hidden rounded-3xl shadow-[0_14px_36px_-18px_rgba(0,0,0,0.45)] transition duration-300 active:scale-[0.98] hover:shadow-[0_18px_44px_-16px_rgba(0,0,0,0.5)]",
        compact ? "aspect-[3/4]" : "aspect-[5/6] sm:aspect-[4/5]",
      )}
    >
      <img
        src={getCategoryCoverUrl(category, 960)}
        alt=""
        loading="lazy"
        className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
      <div
        className={cn(
          "absolute inset-x-2 bottom-2 rounded-xl border border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl",
          compact ? "px-2 py-1.5" : "inset-x-3 bottom-3 rounded-2xl px-3 py-2.5 sm:inset-x-4 sm:bottom-4 sm:px-4 sm:py-3",
        )}
      >
        <div className="flex items-end justify-between gap-1.5">
          <div className="min-w-0">
            <p
              className={cn(
                "truncate font-bold text-white",
                compact ? "text-[11px] leading-tight" : "text-sm sm:text-base",
              )}
            >
              {label}
            </p>
            {!compact ? (
              <p className="mt-0.5 truncate text-[11px] text-white/75 sm:text-xs">{hint}</p>
            ) : null}
          </div>
          {!compact ? (
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition group-hover:bg-white/20">
              <ChevronRight className="size-4" strokeWidth={2.5} />
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function HomeCategoryGrid({ className, titleClassName, compact }: Props) {
  const { t } = useTranslation();

  return (
    <section className={cn("min-w-0", className)}>
      <h2
        className={cn(
          "mb-4 font-bold tracking-tight",
          compact ? "text-base" : "text-xl xl:text-2xl",
          titleClassName,
        )}
      >
        {t("home.sections.browseCategories")}
      </h2>
      <div
        className={cn(
          "grid w-full gap-3",
          compact ? "grid-cols-3 gap-2.5" : "grid-cols-1 sm:grid-cols-3 sm:gap-4",
        )}
      >
        {HOME_CATEGORY_KEYS.map((category) => (
          <CategoryGlassCard
            key={category}
            category={category}
            label={t(`home.categories.${category}`)}
            hint={t(CATEGORY_HINT_KEYS[category])}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
}
