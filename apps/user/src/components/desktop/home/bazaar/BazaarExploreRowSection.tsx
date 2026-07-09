import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getHairstyleDisplayUrl, type TrendingHairstyle } from "@/lib/hairstyles/catalog";
import { HOME_SALON_ROW_PREVIEW } from "@/lib/home-sections";
import { BazaarSectionHeader } from "./BazaarParts";

function ExploreStyleCard({ style }: { style: TrendingHairstyle }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const src = style.imageUrl
    ? getHairstyleDisplayUrl({ imageUrl: style.imageUrl, slug: style.seed })
    : "";

  if (!src || failed) return null;

  return (
    <Link
      to="/explore/$styleId"
      params={{ styleId: style.id }}
      className="group block w-[min(42vw,200px)] shrink-0 snap-start transition-opacity hover:opacity-95 sm:w-[180px] lg:w-[calc((100%-4rem)/5)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#E8E8E8] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.35)] transition-shadow group-hover:shadow-[0_14px_32px_-10px_rgba(0,0,0,0.4)]">
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <p className="mt-2.5 truncate text-sm font-bold leading-tight">{style.title}</p>
      <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t(`homePage.audience.${style.audience}`)} · {style.category}
      </p>
    </Link>
  );
}

type Props = {
  titleKey: string;
  styles: TrendingHairstyle[];
  viewAllTo?: string;
};

export function BazaarExploreRowSection({ titleKey, styles, viewAllTo = "/explore" }: Props) {
  const { t } = useTranslation();

  if (styles.length === 0) return null;

  return (
    <section className="min-w-0 lg:col-span-5 lg:col-start-1">
      <BazaarSectionHeader
        title={t(titleKey)}
        count={styles.length}
        viewAllTo={viewAllTo}
        className="mb-4"
      />
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1 snap-x snap-mandatory">
        {styles.map((style) => (
          <ExploreStyleCard key={`${style.id}-${style.personaId ?? "default"}`} style={style} />
        ))}
      </div>
    </section>
  );
}

export function BazaarExploreRowSectionSkeleton() {
  return (
    <div className="min-w-0 lg:col-span-5 lg:col-start-1">
      <div className="mb-4 h-8 w-40 animate-pulse rounded-lg bg-surface" />
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
        {Array.from({ length: HOME_SALON_ROW_PREVIEW }).map((_, i) => (
          <div key={i} className="w-[min(42vw,200px)] shrink-0 animate-pulse sm:w-[180px] lg:w-[calc((100%-4rem)/5)]">
            <div className="aspect-[3/4] rounded-2xl bg-surface" />
            <div className="mt-3 h-4 w-2/3 rounded bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
