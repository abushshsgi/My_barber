import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Search,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { HomeData } from "@/components/home/useHomeData";
import { SalonCard } from "@/components/SalonCard";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import {
  getHairstyleImageUrl,
  hairstyleImageFallbacks,
  type TrendingHairstyle,
} from "@/lib/hairstyles/catalog";
import type { Offer } from "@/lib/mock-data";

function TrendingStyleImage({ style }: { style: TrendingHairstyle }) {
  const candidates = useMemo(() => {
    const primary = getHairstyleImageUrl({ imageUrl: style.imageUrl });
    const fallbacks = hairstyleImageFallbacks(style.imageUrl).filter((url) => url !== primary);
    return [...new Set([primary, ...fallbacks])];
  }, [style.imageUrl]);

  const [index, setIndex] = useState(0);
  const src = candidates[index] ?? getHairstyleImageUrl({ imageUrl: style.imageUrl });

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => {
        setIndex((current) => (current + 1 < candidates.length ? current + 1 : current));
      }}
      className="absolute inset-0 h-full w-full object-cover object-top"
    />
  );
}

export function HomeAudience() {
  return (
    <div className="px-5 pt-2">
      <AudienceSwitch />
    </div>
  );
}

type SearchProps = Pick<HomeData, "query" | "setQuery" | "visibleCategoryKeys" | "effectiveCat" | "setCat">;

export function HomeSearchAndCategories({ query, setQuery, visibleCategoryKeys, effectiveCat, setCat }: SearchProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="px-5 pt-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search")}
            className="w-full rounded-2xl border-0 bg-surface py-3.5 pl-11 pr-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
          />
        </div>
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-5">
        {visibleCategoryKeys.map((key) => {
          const active = effectiveCat === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCat(key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[12px] font-bold tracking-wide transition-colors",
                active ? "bg-foreground text-background" : "bg-surface text-foreground",
              )}
            >
              {t(`home.categories.${key}`)}
            </button>
          );
        })}
      </div>
    </>
  );
}

export function HomeOfferBanner({ offer }: { offer: Offer }) {
  const { t } = useTranslation();
  return (
    <section className="mt-6 px-5">
      <Link
        to="/offers"
        className="block overflow-hidden rounded-2xl bg-foreground p-5 text-background active:scale-[0.98] transition-transform"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/60">
          {t("homePage.featuredOffer")}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight">{offer.title}</p>
            <p className="mt-0.5 truncate text-xs font-medium text-background/70">
              {offer.salonName} · {t("homePage.validUntil", { date: offer.validUntil })}
            </p>
          </div>
          <div className="shrink-0 rounded-full bg-background px-3 py-1.5 text-sm font-bold text-foreground">
            −{offer.discountPct}%
          </div>
        </div>
      </Link>
    </section>
  );
}

export function HomeTrendingStrip({ trending }: { trending: TrendingHairstyle[] }) {
  const { t } = useTranslation();
  if (trending.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between px-5">
        <h2 className="text-lg font-bold tracking-tight">{t("homePage.quick.trends")}</h2>
        <Link to="/explore" className="flex items-center text-[12px] font-bold text-foreground">
          {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5">
        {trending.map((s) => (
          <Link key={s.id} to="/explore/$styleId" params={{ styleId: s.id }} className="w-[140px] shrink-0">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
              <TrendingStyleImage style={s} />
            </div>
            <p className="mt-2 text-[13px] font-bold leading-tight">{s.title}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t(`homePage.audience.${s.audience}`)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HomeSalonList({ salons: list }: { salons: HomeData["filtered"] }) {
  const { t } = useTranslation();

  return (
    <section className="mt-8 px-5">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-lg font-bold tracking-tight">{t("home.nearby")}</h2>
        <Link to="/map" className="flex items-center text-[12px] font-bold text-foreground">
          {t("common.viewMap")} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl bg-surface p-8 text-center">
          <p className="text-sm font-bold">{t("homePage.emptyTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("homePage.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {list.map((s) => (
            <SalonCard key={s.id} salon={s} />
          ))}
        </div>
      )}
    </section>
  );
}

export function HomeSalonCarousel({ salons: list, titleKey }: { salons: HomeData["featuredSalons"]; titleKey: string }) {
  const { t } = useTranslation();
  if (list.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 px-5">
        <h2 className="text-lg font-bold tracking-tight">{t(titleKey)}</h2>
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-1">
        {list.map((s) => (
          <div key={s.id} className="w-[280px] shrink-0">
            <SalonCard salon={s} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeTrustStrip() {
  const { t } = useTranslation();
  return (
    <section className="mx-5 mt-8 rounded-2xl border border-border bg-surface/50 p-5">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xl font-bold">120+</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("homePage.trust.salons")}
          </p>
        </div>
        <div className="border-x border-border">
          <p className="text-xl font-bold">450+</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("homePage.trust.barbers")}
          </p>
        </div>
        <div>
          <p className="text-xl font-bold">4.9</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("homePage.trust.rating")}
          </p>
        </div>
      </div>
    </section>
  );
}

export function HomeEditorialHero() {
  const { t } = useTranslation();
  return (
    <section className="mx-5 mt-2 overflow-hidden rounded-[28px] border border-border bg-surface p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">mysaloon.uz</p>
      <h1 className="mt-2 text-[30px] font-bold leading-[1.05] tracking-tight">{t("home.title")}</h1>
      <p className="mt-2 text-sm font-medium text-muted-foreground">{t("homePage.editorialTagline")}</p>
      <div className="mt-4 flex gap-2">
        <Link
          to="/today"
          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-foreground py-3 text-xs font-bold text-background"
        >
          {t("homePage.quick.today")}
        </Link>
        <Link
          to="/ai-style"
          className="inline-flex flex-1 items-center justify-center rounded-2xl border-2 border-foreground py-3 text-xs font-bold"
        >
          {t("homePage.quick.aiStyle")}
        </Link>
      </div>
    </section>
  );
}

export function HomeAiPromo() {
  const { t } = useTranslation();
  return (
    <section className="mx-5 mt-6">
      <Link
        to="/ai-style"
        className="flex items-center gap-4 rounded-[22px] border border-border bg-background p-4 active:scale-[0.99] transition-transform"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
          <Wand2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{t("homePage.aiPromoTitle")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("homePage.aiPromoHint")}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </section>
  );
}
