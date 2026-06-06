import { Link } from "@tanstack/react-router";
import {
  Award,
  ChevronRight,
  Film,
  Flame,
  Gift,
  GitCompareArrows,
  Map,
  Search,
  Sparkles,
  Tag,
  Wallet,
  Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPrice, walletSummary } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { HomeData } from "@/components/home/useHomeData";
import { brandCoverGradient } from "@/lib/brand-gradients";
import { SalonCard } from "@/components/SalonCard";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { StoryRings } from "@/components/stories/StoryRings";
import { salonStories } from "@/lib/stories-mock";
import type { Offer, TrendingStyle } from "@/lib/mock-data";

export const QUICK_LINKS_COMPACT = [
  { to: "/today", icon: Flame, labelKey: "homePage.quick.today", primary: true },
  { to: "/map", icon: Map, labelKey: "homePage.quick.map" },
  { to: "/offers", icon: Tag, labelKey: "homePage.quick.offers" },
  { to: "/ai-style", icon: Wand2, labelKey: "homePage.quick.aiStyle" },
] as const;

export const QUICK_LINKS_SCROLL = [
  ...QUICK_LINKS_COMPACT,
  { to: "/stylists", icon: Award, labelKey: "homePage.quick.stylists" },
  { to: "/explore", icon: Sparkles, labelKey: "homePage.quick.trends" },
  { to: "/giftcard", icon: Gift, labelKey: "homePage.quick.gift" },
  { to: "/compare", icon: GitCompareArrows, labelKey: "homePage.quick.compare" },
  { to: "/reels", icon: Film, labelKey: "homePage.quick.reels", primary: true },
] as const;

export function HomeHeader({ editorial }: { editorial?: boolean }) {
  const { t } = useTranslation();
  return (
    <header
      className="px-5 pb-3 pt-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("min-w-0", editorial ? "max-w-none" : "max-w-[280px]")}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            mysaloon.uz
          </p>
          <h1
            className={cn(
              "mt-1 font-bold leading-[1.1] tracking-tight",
              editorial ? "text-[32px]" : "text-[26px]",
            )}
          >
            {t("home.title")}
          </h1>
          {editorial ? (
            <p className="mt-2 max-w-[300px] text-sm font-medium text-muted-foreground">
              {t("homePage.editorialTagline")}
            </p>
          ) : null}
        </div>
        <Link
          to="/wallet"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-2 text-[12px] font-bold tabular-nums text-background active:opacity-90"
          aria-label={t("profile.wallet")}
        >
          {formatPrice(walletSummary.balance)}
          <Wallet className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </header>
  );
}

export function HomeAudience() {
  return (
    <div className="px-5 pt-2">
      <AudienceSwitch />
    </div>
  );
}

export function HomeStories() {
  const { t } = useTranslation();
  return (
    <section className="mt-5 px-5">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-sm font-bold">{t("storiesPage.title")}</h2>
        <Link to="/stories" className="text-[11px] font-bold text-muted-foreground">
          {t("storiesPage.seeAll")}
        </Link>
      </div>
      <StoryRings stories={salonStories} linkTo="viewer" />
    </section>
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

export function HomeTrendingStrip({ trending }: { trending: TrendingStyle[] }) {
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
          <div key={s.id} className="w-[140px] shrink-0">
            <div
              className="aspect-[3/4] rounded-2xl"
              style={{ background: brandCoverGradient(s.seed) }}
            />
            <p className="mt-2 text-[13px] font-bold leading-tight">{s.title}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t(`homePage.audience.${s.audience}`)}
            </p>
          </div>
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

type QuickProps = {
  links: readonly { to: string; icon: typeof Flame; labelKey: string; primary?: boolean }[];
  grid?: boolean;
};

export function HomeQuickLinks({ links, grid }: QuickProps) {
  const { t } = useTranslation();

  if (grid) {
    return (
      <section className="mt-6 grid grid-cols-2 gap-2 px-5">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl p-3 active:scale-[0.97] transition-transform",
                item.primary ? "bg-foreground text-background" : "bg-surface",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2.4} />
              <span className="text-[11px] font-bold leading-tight">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </section>
    );
  }

  return (
    <section className="mt-6 px-5">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-bold active:scale-[0.97] transition-transform",
                item.primary ? "bg-foreground text-background" : "bg-surface",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HomeActionHero() {
  const { t } = useTranslation();
  return (
    <section className="mt-5 grid grid-cols-2 gap-2 px-5">
      <Link
        to="/today"
        className="flex min-h-[100px] flex-col justify-between rounded-[22px] bg-foreground p-4 text-background active:scale-[0.98] transition-transform"
      >
        <Flame className="h-5 w-5" strokeWidth={2.4} />
        <div>
          <p className="text-sm font-bold leading-tight">{t("homePage.quick.today")}</p>
          <p className="mt-1 text-[10px] font-medium text-background/65">{t("homePage.actionTodayHint")}</p>
        </div>
      </Link>
      <Link
        to="/map"
        className="flex min-h-[100px] flex-col justify-between rounded-[22px] border-2 border-foreground bg-background p-4 active:scale-[0.98] transition-transform"
      >
        <Map className="h-5 w-5" strokeWidth={2.4} />
        <div>
          <p className="text-sm font-bold leading-tight">{t("homePage.quick.map")}</p>
          <p className="mt-1 text-[10px] font-medium text-muted-foreground">{t("homePage.actionMapHint")}</p>
        </div>
      </Link>
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
