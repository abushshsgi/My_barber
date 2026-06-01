import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronRight,
  Sparkles,
  Tag,
  Gift,
  Award,
  Flame,
  GitCompareArrows,
  Film,
  Wand2,
  Wallet,
  Bell,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import {
  salons,
  trendingStyles,
  offers,
  formatPrice,
  walletSummary,
} from "@/lib/mock-data";
import type { Category } from "@/lib/mock-data";
import { LuxurySalonCard } from "@/components/luxury/LuxurySalonCard";
import { MapPreviewCard } from "@/components/luxury/MapPreviewCard";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import {
  useAudience,
  matchAudience,
  audienceToCategory,
  categoriesForAudience,
} from "@/hooks/use-audience";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "mysaloon.uz — Sartaroshxona va salon bron qiling" },
      {
        name: "description",
        content:
          "O'zbekistondagi sartaroshlar va go'zallik salonlarini online bron qiluvchi platforma.",
      },
    ],
  }),
  component: Home,
});

const CATEGORIES: { key: Category | "all"; label: string }[] = [
  { key: "all", label: "Barchasi" },
  { key: "barber", label: "Barber" },
  { key: "beauty", label: "Go'zallik" },
  { key: "nails", label: "Manikyur" },
  { key: "spa", label: "Spa" },
];

const QUICK_ACTIONS = [
  { to: "/today", icon: Flame, label: "Bugungi vaqtlar", featured: true },
  { to: "/stylists", icon: Award, label: "Top ustalar" },
  { to: "/explore", icon: Sparkles, label: "Trend uslublar" },
  { to: "/offers", icon: Tag, label: "Aksiyalar" },
  { to: "/giftcard", icon: Gift, label: "Sovg'a karta" },
  { to: "/compare", icon: GitCompareArrows, label: "Taqqoslash" },
  { to: "/reels", icon: Film, label: "Reels", featured: true },
  { to: "/ai-style", icon: Wand2, label: "AI stil" },
  { to: "/wallet", icon: Wallet, label: "Hamyon" },
] as const;

function Home() {
  const { t } = useTranslation();
  const { audience } = useAudience();
  const reduce = useReducedMotion();
  const [cat, setCat] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setCat(audienceToCategory(audience));
  }, [audience]);

  const effectiveCat = useMemo(() => {
    if (audience === "all") return cat;
    const allowed = categoriesForAudience(audience);
    if (allowed.includes(cat)) return cat;
    return audienceToCategory(audience);
  }, [audience, cat]);

  const visibleCategories = CATEGORIES.filter((c) =>
    categoriesForAudience(audience).includes(c.key),
  );

  const filtered = salons.filter(
    (s) =>
      matchAudience(s.audience, audience) &&
      (effectiveCat === "all" || s.category === effectiveCat) &&
      (query === "" || s.name.toLowerCase().includes(query.toLowerCase())),
  );

  const trending = trendingStyles.filter((x) => matchAudience(x.audience, audience));

  const topOffer = offers.find((o) => matchAudience(o.audience, audience));
  const featured = filtered[0];
  const grid = filtered.slice(1);

  return (
    <div>
      {/* Immersive editorial header */}
      <header
        className="relative px-5 pt-4 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold">
              mysaloon · premium
            </p>
            <h1 className="mt-1 font-display text-[28px] font-semibold leading-[1.05] tracking-tight">
              Bugun yangi ko'rinishingizni
              <br />
              <span className="text-gradient-gold">bron qiling</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              aria-label="Bildirishnomalar"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-surface active:scale-95"
            >
              <Bell className="h-4 w-4" strokeWidth={2.2} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold" />
            </Link>
            <Link
              to="/wallet"
              aria-label={t("profile.wallet") as string}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-onyx px-3 py-2 text-[12px] font-bold tabular-nums text-ivory shadow-soft active:opacity-90"
            >
              {formatPrice(walletSummary.balance)}
              <Wallet className="h-4 w-4 text-gold" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </header>

      {/* Audience switch */}
      <div className="px-5 pt-3">
        <AudienceSwitch />
      </div>

      {/* Search */}
      <div className="px-5 pt-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search") as string}
            className={cn(
              "w-full rounded-2xl border border-border bg-surface py-3.5 pl-11 pr-4 text-sm font-medium",
              "placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-gold",
            )}
          />
        </div>
      </div>

      {/* Categories — dynamic chips */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5">
        {visibleCategories.map((c) => {
          const active = effectiveCat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[12px] font-bold tracking-wide transition-colors",
                active
                  ? "bg-foreground text-background shadow-soft"
                  : "border border-border bg-surface text-foreground",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Interactive Map Preview widget */}
      <section className="mt-6 px-5">
        <MapPreviewCard nearbyCount={filtered.length || salons.length} />
      </section>

      {/* Quick actions — luxury chips */}
      <section className="mt-6 px-5">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-base font-semibold tracking-tight">
            Tezkor xizmatlar
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-2xl p-3 transition-all active:scale-[0.97]",
                  a.featured
                    ? "bg-onyx text-ivory shadow-soft ring-1 ring-gold/20"
                    : "border border-border bg-surface text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full",
                    a.featured ? "bg-gold/15 text-gold" : "bg-background text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                <span className="text-[11px] font-bold leading-tight">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Top offer banner */}
      {topOffer && (
        <section className="mt-6 px-5">
          <Link
            to="/offers"
            className="relative block overflow-hidden rounded-3xl bg-onyx p-5 text-ivory shadow-luxury active:scale-[0.99] transition-transform"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(212,175,55,0.45), rgba(212,175,55,0) 70%)",
              }}
            />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
              Bugungi taklif
            </p>
            <div className="relative mt-2 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold leading-tight">
                  {topOffer.title}
                </p>
                <p className="mt-1 truncate text-xs font-medium text-ivory/70">
                  {topOffer.salonName} · {topOffer.validUntil} gacha
                </p>
              </div>
              <div className="shrink-0 rounded-full bg-gold px-3 py-1.5 text-sm font-bold tabular-nums text-onyx shadow-pill">
                −{topOffer.discountPct}%
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Trending styles */}
      {trending.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between px-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                Editorial
              </p>
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Trend uslublar
              </h2>
            </div>
            <Link
              to="/explore"
              className="flex items-center text-[12px] font-bold text-foreground"
            >
              Hammasi <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5">
            {trending.map((s, i) => (
              <motion.div
                key={s.id}
                initial={reduce ? undefined : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.32, delay: i * 0.04 }}
                className="w-[150px] shrink-0"
              >
                <div
                  className="relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-foreground/5"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.78 0.05 ${(s.id.charCodeAt(1) * 30) % 360}), oklch(0.30 0.04 ${(s.id.charCodeAt(1) * 30 + 80) % 360}))`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <p className="absolute bottom-2 left-2 right-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ivory">
                    {s.audience === "men"
                      ? "Erkaklar"
                      : s.audience === "women"
                        ? "Ayollar"
                        : "Universal"}
                  </p>
                </div>
                <p className="mt-2 text-[13px] font-bold leading-tight">{s.title}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Featured + Luxury grid (2 columns) */}
      <section className="mt-8 px-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
              Tanlangan salonlar
            </p>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {t("home.nearby")}
            </h2>
          </div>
          <Link
            to="/map"
            className="flex items-center text-[12px] font-bold text-foreground"
          >
            {t("common.viewMap")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-8 text-center">
            <p className="text-sm font-bold">Mos salon topilmadi</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Filtr yoki auditoriyani o'zgartirib ko'ring
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {featured && (
              <LuxurySalonCard key={featured.id} salon={featured} variant="wide" />
            )}
            {grid.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {grid.map((s) => (
                  <LuxurySalonCard key={s.id} salon={s} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Trust strip */}
      <section className="mx-5 mt-8 rounded-3xl border border-border bg-surface/50 p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-display text-2xl font-semibold">120+</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Salon
            </p>
          </div>
          <div className="border-x border-border">
            <p className="font-display text-2xl font-semibold">450+</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Usta
            </p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-gold">4.9</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Reyting
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
