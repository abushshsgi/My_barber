import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ChevronRight, Bell, Sparkles, Tag, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import { salons, notifications, trendingStyles, offers } from "@/lib/mock-data";
import type { Category } from "@/lib/mock-data";
import { SalonCard } from "@/components/SalonCard";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { useAudience, matchAudience } from "@/hooks/use-audience";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "mysaloon.uz — Sartaroshxona va salon bron qiling" },
      {
        name: "description",
        content: "O'zbekistondagi sartaroshlar va go'zallik salonlarini online bron qiluvchi platforma.",
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

function Home() {
  const { t } = useTranslation();
  const { audience } = useAudience();
  const [cat, setCat] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const unread = notifications.filter((n) => !n.read).length;

  const filtered = salons.filter(
    (s) =>
      (cat === "all" || s.category === cat) &&
      matchAudience(s.audience, audience) &&
      (query === "" || s.name.toLowerCase().includes(query.toLowerCase())),
  );

  const trending = trendingStyles.filter(
    (x) => audience === "all" || x.audience === "unisex" || x.audience === audience,
  );

  const topOffer = offers.find(
    (o) => audience === "all" || o.audience === "unisex" || o.audience === audience,
  );

  return (
    <div>
      {/* Editorial header — no greeting */}
      <header
        className="px-5 pt-4 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <div className="flex items-start justify-between">
          <div className="max-w-[280px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              mysaloon.uz
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-[1.1] tracking-tight">
              Ko'rinishingizni bugun yangilang
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative grid h-11 w-11 place-items-center rounded-full bg-surface active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" strokeWidth={2} />
              {unread > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-foreground ring-2 ring-background" />
              )}
            </Link>
            <Link
              to="/profile"
              className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-foreground text-background"
              aria-label="Profile"
            >
              <span className="text-sm font-bold">A</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Audience switch */}
      <div className="px-5 pt-2">
        <AudienceSwitch />
      </div>

      {/* Search */}
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

      {/* Categories */}
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-5">
        {CATEGORIES.map((c) => {
          const active = cat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[12px] font-bold tracking-wide transition-colors",
                active ? "bg-foreground text-background" : "bg-surface text-foreground",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <section className="mt-6 grid grid-cols-3 gap-2 px-5">
        <Link
          to="/explore"
          className="flex flex-col items-start gap-1 rounded-2xl bg-surface p-3 active:scale-[0.97] transition-transform"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2.4} />
          <span className="text-[11px] font-bold leading-tight">Trend uslublar</span>
        </Link>
        <Link
          to="/offers"
          className="flex flex-col items-start gap-1 rounded-2xl bg-surface p-3 active:scale-[0.97] transition-transform"
        >
          <Tag className="h-4 w-4" strokeWidth={2.4} />
          <span className="text-[11px] font-bold leading-tight">Aksiyalar</span>
        </Link>
        <Link
          to="/giftcard"
          className="flex flex-col items-start gap-1 rounded-2xl bg-surface p-3 active:scale-[0.97] transition-transform"
        >
          <Gift className="h-4 w-4" strokeWidth={2.4} />
          <span className="text-[11px] font-bold leading-tight">Sovg'a karta</span>
        </Link>
      </section>

      {/* Offer banner */}
      {topOffer && (
        <section className="mt-6 px-5">
          <Link
            to="/offers"
            className="block overflow-hidden rounded-2xl bg-foreground p-5 text-background active:scale-[0.98] transition-transform"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/60">
              Bugungi taklif
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">{topOffer.title}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-background/70">
                  {topOffer.salonName} · {topOffer.validUntil} gacha
                </p>
              </div>
              <div className="shrink-0 rounded-full bg-background px-3 py-1.5 text-sm font-bold text-foreground">
                −{topOffer.discountPct}%
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Trending styles */}
      {trending.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between px-5">
            <h2 className="text-lg font-bold tracking-tight">Trend uslublar</h2>
            <Link
              to="/explore"
              className="flex items-center text-[12px] font-bold text-foreground"
            >
              Hammasi <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5">
            {trending.map((s) => (
              <div key={s.id} className="w-[140px] shrink-0">
                <div
                  className="aspect-[3/4] rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.82 0.03 ${(s.id.charCodeAt(1) * 30) % 360}), oklch(0.38 0.02 ${(s.id.charCodeAt(1) * 30 + 80) % 360}))`,
                  }}
                />
                <p className="mt-2 text-[13px] font-bold leading-tight">{s.title}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {s.audience === "men" ? "Erkaklar" : s.audience === "women" ? "Ayollar" : "Universal"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nearby */}
      <section className="mt-8 px-5">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-bold tracking-tight">{t("home.nearby")}</h2>
          <Link
            to="/map"
            className="flex items-center text-[12px] font-bold text-foreground"
          >
            {t("common.viewMap")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-surface p-8 text-center">
            <p className="text-sm font-bold">Mos salon topilmadi</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Filtr yoki auditoriyani o'zgartirib ko'ring
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((s) => (
              <SalonCard key={s.id} salon={s} />
            ))}
          </div>
        )}
      </section>

      {/* Trust strip */}
      <section className="mx-5 mt-8 rounded-2xl border border-border bg-surface/50 p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold">120+</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Salon
            </p>
          </div>
          <div className="border-x border-border">
            <p className="text-xl font-bold">450+</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Usta
            </p>
          </div>
          <div>
            <p className="text-xl font-bold">4.9</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Reyting
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
