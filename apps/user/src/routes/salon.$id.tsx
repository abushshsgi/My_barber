import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Heart, Star, MapPin, Share2, Plus, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { salons, formatPrice } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salon/$id")({
  head: ({ params }) => {
    const salon = salons.find((s) => s.id === params.id);
    return {
      meta: [
        { title: `${salon?.name ?? "Salon"} — mysaloon.uz` },
        { name: "description", content: salon?.about ?? "Salon detail page." },
      ],
    };
  },
  component: SalonPage,
});

const TAB_KEYS = ["about", "services", "staff", "reviews", "portfolio"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function SalonPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/salon/$id" });
  const reduce = useReducedMotion();
  const salon = salons.find((s) => s.id === id) ?? salons[0];
  const [tab, setTab] = useState<TabKey>("services");
  const { isFav, toggle } = useFavorites();
  const fav = isFav(salon.id);

  return (
    <div className="pb-32">
      {/* Editorial hero */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, oklch(0.78 0.05 ${(Number(salon.id) * 80) % 360}), oklch(0.30 0.05 ${(Number(salon.id) * 80 + 50) % 360}))`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-background" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 top-1/3 h-44 w-44 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.35), rgba(212,175,55,0) 70%)",
          }}
        />

        <div className="absolute inset-x-0 top-0">
          <PageHeader
            showBack
            transparent
            right={
              <>
                <button className="grid h-10 w-10 place-items-center rounded-full bg-background/85 backdrop-blur ring-1 ring-foreground/10 active:scale-95">
                  <Share2 className="h-4 w-4" />
                </button>
                <motion.button
                  whileTap={reduce ? undefined : { scale: 0.86 }}
                  onClick={() => toggle(salon.id)}
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-full backdrop-blur ring-1 ring-foreground/10 active:scale-95",
                    fav ? "bg-gold text-onyx" : "bg-background/85 text-foreground",
                  )}
                >
                  <motion.span
                    key={String(fav)}
                    initial={reduce ? undefined : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 360, damping: 22 }}
                  >
                    <Heart
                      className={cn("h-4 w-4", fav ? "fill-onyx" : "")}
                      strokeWidth={2.2}
                    />
                  </motion.span>
                </motion.button>
              </>
            }
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 text-ivory">
          {salon.rating >= 4.8 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-onyx shadow-pill">
              <Star className="h-3 w-3 fill-onyx" strokeWidth={0} /> Premium
            </span>
          )}
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">
            {salon.category}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight">
            {salon.name}
          </h1>
          <div className="mt-2 flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" strokeWidth={0} />
              {salon.rating} ({salon.reviewCount})
            </span>
            <span className="opacity-50">·</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {salon.distanceKm} km
            </span>
            <span className="opacity-50">·</span>
            <span>dan {formatPrice(salon.priceFrom)}</span>
          </div>
        </div>
      </div>

      {/* Sticky tabs */}
      <div className="sticky top-0 z-20 -mt-px border-b border-border bg-background/95 backdrop-blur-md">
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-3">
          {TAB_KEYS.map((k) => {
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn(
                  "relative shrink-0 px-3 py-3.5 text-[12px] font-bold tracking-wide transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(`salon.tabs.${k}`)}
                {active && (
                  <motion.span
                    layoutId="salon-tab-underline"
                    className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-gold"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "about" && (
              <div className="space-y-5">
                <p className="text-sm leading-relaxed">{salon.about}</p>
                <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
                    Manzil
                  </p>
                  <p className="mt-1 text-sm font-bold">{salon.address}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {salon.distanceKm} km uzoqlikda
                  </p>
                </div>
              </div>
            )}

            {tab === "services" && (
              <div className="divide-y divide-border">
                {salon.services.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-4"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold">{s.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.duration} {t("salon.minutes")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold tabular-nums">
                        {formatPrice(s.price)}
                      </span>
                      <Link
                        to="/booking/$salonId"
                        params={{ salonId: salon.id }}
                        className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background shadow-soft active:scale-95"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.4} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "staff" && (
              <div className="grid grid-cols-2 gap-3">
                {salon.staff.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-3xl border border-border bg-card p-4 text-center shadow-soft"
                  >
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-onyx text-lg font-bold text-ivory ring-2 ring-gold/30">
                      {b.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <p className="mt-3 font-display text-sm font-semibold">{b.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{b.role}</p>
                    <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold">
                      <Star className="h-3 w-3 fill-gold text-gold" strokeWidth={0} />
                      {b.rating}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {tab === "reviews" && (
              <div className="space-y-4">
                {salon.reviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-3xl border border-border bg-card p-4 shadow-soft"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{r.author}</p>
                      <div className="flex items-center gap-1 text-[11px] font-bold">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-3 w-3 fill-gold text-gold"
                            strokeWidth={0}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{r.text}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {r.date}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {tab === "portfolio" && (
              <div className="grid grid-cols-3 gap-2">
                {salon.portfolio.map((p, i) => (
                  <div
                    key={p}
                    className="aspect-square rounded-2xl ring-1 ring-foreground/5"
                    style={{
                      background: `linear-gradient(${135 + i * 20}deg, oklch(0.78 0.05 ${(i * 60) % 360}), oklch(0.30 0.05 ${(i * 60 + 80) % 360}))`,
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 px-5 pt-3 lg:left-[240px]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        <div className="mx-auto max-w-[480px] lg:max-w-[720px]">
          <Link
            to="/booking/$salonId"
            params={{ salonId: salon.id }}
            className="flex w-full items-center justify-between gap-2 rounded-full bg-onyx px-5 py-4 text-ivory shadow-luxury ring-1 ring-gold/30 active:scale-[0.99]"
          >
            <span className="inline-flex items-center gap-2 text-sm font-bold tracking-wide">
              <Calendar className="h-4 w-4 text-gold" strokeWidth={2.4} />
              {t("salon.bookNow")}
            </span>
            <span className="rounded-full bg-gold px-3 py-1.5 text-sm font-bold tabular-nums text-onyx">
              {formatPrice(salon.priceFrom)}+
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
