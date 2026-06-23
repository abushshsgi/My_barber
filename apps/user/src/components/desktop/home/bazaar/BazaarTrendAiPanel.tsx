import { Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getTrendCoverUrl } from "@/lib/cover-images";
import { getHairstyleDisplayUrl, type TrendingHairstyle } from "@/lib/hairstyles/catalog";

function DesktopTrendCard({ style }: { style: TrendingHairstyle }) {
  const { t } = useTranslation();
  const [src, setSrc] = useState(() =>
    getHairstyleDisplayUrl({ imageUrl: style.imageUrl, slug: style.seed }),
  );
  if (!src) return null;

  return (
    <Link
      to="/explore/$styleId"
      params={{ styleId: style.id }}
      className="group block min-w-0"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface">
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setSrc(getTrendCoverUrl(style.seed))}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <p className="mt-2 truncate text-[13px] font-semibold leading-snug">{style.title}</p>
      <p className="truncate text-[11px] text-muted-foreground">
        {t(`homePage.audience.${style.audience}`)}
      </p>
    </Link>
  );
}

type Props = {
  trending: TrendingHairstyle[];
};

export function BazaarTrendAiPanel({ trending }: Props) {
  const { t } = useTranslation();
  const items = trending.slice(0, 4);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 shrink-0 text-foreground" />
            <h2 className="truncate text-sm font-bold tracking-tight">
              {t("homePage.quick.trends")}
            </h2>
          </div>
          <Link
            to="/explore"
            className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("common.viewAll")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {items.length > 0 ? (
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
            {items.map((style) => (
              <DesktopTrendCard key={style.id} style={style} />
            ))}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl bg-surface/60 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t("homePage.emptyHint")}</p>
          </div>
        )}
      </div>

      <Link
        to="/ai-style"
        className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-foreground text-background transition-transform group-hover:scale-105">
          <Wand2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{t("homePage.aiPromoTitle")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("homePage.aiPromoHint")}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
