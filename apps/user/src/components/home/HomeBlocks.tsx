import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Search,
  Star,
  User,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { HomeData } from "@/components/home/useHomeData";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";
import { SalonCard } from "@/components/SalonCard";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { getHairstyleDisplayUrl, type TrendingHairstyle } from "@/lib/hairstyles/catalog";
import type { Offer } from "@/lib/mock-data";
import type { BarberDiscovery } from "@/lib/mappers/barber";

function TrendingStyleCard({ style }: { style: TrendingHairstyle }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const src = style.imageUrl
    ? getHairstyleDisplayUrl({ imageUrl: style.imageUrl, slug: style.seed })
    : "";

  if (!src || failed) return null;

  return (
    <Link to="/explore/$styleId" params={{ styleId: style.id }} className="w-[140px] shrink-0">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>
      <p className="mt-2 text-[13px] font-bold leading-tight">{style.title}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {t(`homePage.audience.${style.audience}`)}
      </p>
    </Link>
  );
}

export function HomeAudience() {
  return (
    <div className="pt-1">
      <AudienceSwitch />
    </div>
  );
}

type SearchProps = Pick<HomeData, "query" | "setQuery" | "visibleCategoryKeys" | "effectiveCat" | "setCat">;

export function HomeSearchAndCategories({ query, setQuery, visibleCategoryKeys, effectiveCat, setCat }: SearchProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="pt-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search")}
            className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
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

export function HomeUnifiedSearchResults({
  searchActive,
  salons,
  barbers,
  loading,
}: {
  searchActive: boolean;
  salons: HomeData["filtered"];
  barbers: BarberDiscovery[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  if (!searchActive) return null;

  if (loading) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
    );
  }

  if (salons.length === 0 && barbers.length === 0) {
    return (
      <section className="mt-4 px-4">
        <NoSalonsEmpty compact />
      </section>
    );
  }

  return (
    <section className="mt-4 space-y-6 px-4">
      {salons.length > 0 ? (
        <div>
          <h2 className="mb-4 text-lg font-bold tracking-tight">
            {t("map.tabSalons", { defaultValue: "Salonlar" })}
          </h2>
          <div className="space-y-5">
            {salons.map((s) => (
              <SalonCard key={s.id} salon={s} />
            ))}
          </div>
        </div>
      ) : null}
      {barbers.length > 0 ? (
        <div>
          <h2 className="mb-4 text-lg font-bold tracking-tight">
            {t("map.tabBarbers", { defaultValue: "Ustalar" })}
          </h2>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {barbers.map((b) => {
              const bookTo =
                b.bookingKind === "salon" && b.salonId
                  ? `/booking/${b.salonId}?barber=${b.barberId}`
                  : `/booking/barber/${b.barberId}`;
              return (
                <li key={b.id} className="flex gap-3 p-4">
                  <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                    {b.avatar ? (
                      <img src={b.avatar} alt="" className="size-full object-cover" />
                    ) : (
                      <User className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{b.name}</p>
                    {b.salonName ? (
                      <p className="text-xs text-muted-foreground truncate">{b.salonName}</p>
                    ) : null}
                    {b.rating > 0 ? (
                      <p className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold">
                        <Star className="size-3 fill-foreground" />
                        {b.rating.toFixed(1)}
                      </p>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <Link to={bookTo} className="rounded-xl bg-foreground px-3 py-1.5 text-xs font-bold text-background">
                        {t("map.bookBarber", { defaultValue: "Bron qilish" })}
                      </Link>
                      <Link
                        to="/barber/$barberId"
                        params={{ barberId: b.barberId }}
                        className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold"
                      >
                        {t("map.viewProfile", { defaultValue: "Profil" })}
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
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

export function HomeTrendingStrip({
  trending,
  compact = false,
}: {
  trending: TrendingHairstyle[];
  compact?: boolean;
}) {
  const { t } = useTranslation();
  if (trending.length === 0) return null;

  return (
    <section className={compact ? undefined : "mt-8"}>
      <div
        className={cn(
          "mb-3 flex items-end justify-between",
          compact ? "px-4" : "mb-4 px-5",
        )}
      >
        <h2
          className={cn(
            "font-bold tracking-tight",
            compact ? "text-[15px] font-extrabold" : "text-lg",
          )}
        >
          {t("homePage.quick.trends")}
        </h2>
        <Link
          to="/explore"
          className={cn(
            "flex items-center font-bold text-foreground",
            compact ? "text-xs font-semibold text-muted-foreground" : "text-[12px]",
          )}
        >
          {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div
        className={cn(
          "no-scrollbar flex touch-pan-x gap-3 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          compact ? "px-4 pb-1" : "px-5",
        )}
      >
        {trending.map((s) => (
          <TrendingStyleCard key={s.id} style={s} />
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
        <NoSalonsEmpty compact />
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

export function HomeAiPromo() {
  const { t } = useTranslation();
  return (
    <section className="mx-5 mt-6">
      <Link
        to="/ai-style"
        className="flex w-full items-center gap-4 rounded-[22px] border border-border bg-background p-4 active:scale-[0.99] transition-transform"
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
