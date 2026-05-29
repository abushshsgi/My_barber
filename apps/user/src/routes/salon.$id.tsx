import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Star, MapPin, Share2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { salons, formatPrice } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
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
  const salon = salons.find((s) => s.id === id) ?? salons[0];
  const [tab, setTab] = useState<TabKey>("services");
  const [fav, setFav] = useState(false);

  return (
    <div className="pb-32">
      {/* Hero */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, oklch(0.82 0.04 ${(Number(salon.id) * 80) % 360}), oklch(0.45 0.06 ${(Number(salon.id) * 80 + 50) % 360}))`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />

        {/* Top actions */}
        <div className="absolute inset-x-0 top-0">
          <PageHeader
            showBack
            transparent
            right={
              <>
                <button className="grid h-10 w-10 place-items-center rounded-full bg-background/90 backdrop-blur active:scale-95">
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFav((f) => !f)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-background/90 backdrop-blur active:scale-95"
                >
                  <Heart
                    className={cn("h-4 w-4", fav && "fill-foreground")}
                    strokeWidth={2}
                  />
                </button>
              </>
            }
          />
        </div>

        {/* Bottom info */}
        <div className="absolute inset-x-0 bottom-0 p-5 text-background">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">
            {salon.category}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{salon.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-background" />
              {salon.rating} ({salon.reviewCount})
            </span>
            <span className="opacity-50">·</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {salon.distanceKm} km
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
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
                  <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5 pt-6">
        {tab === "about" && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed">{salon.about}</p>
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
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
              <div key={s.id} className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold">{s.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.duration} {t("salon.minutes")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{formatPrice(s.price)}</span>
                  <Link
                    to="/booking/$salonId"
                    params={{ salonId: salon.id }}
                    className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background active:scale-95"
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
              <div key={b.id} className="rounded-2xl bg-surface p-4 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-foreground text-lg font-bold text-background">
                  {b.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <p className="mt-3 text-sm font-bold">{b.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{b.role}</p>
                <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold">
                  <Star className="h-3 w-3 fill-foreground" />
                  {b.rating}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "reviews" && (
          <div className="space-y-4">
            {salon.reviews.map((r) => (
              <div key={r.id} className="rounded-2xl bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{r.author}</p>
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-foreground" />
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
                className="aspect-square rounded-xl"
                style={{
                  background: `linear-gradient(${135 + i * 20}deg, oklch(0.85 0.04 ${(i * 60) % 360}), oklch(0.5 0.06 ${(i * 60 + 80) % 360}))`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 pt-3 backdrop-blur-md lg:left-[240px]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        <div className="mx-auto max-w-[480px] lg:max-w-[720px]">
          <Link
            to="/booking/$salonId"
            params={{ salonId: salon.id }}
            className="flex w-full items-center justify-center rounded-2xl bg-foreground py-4 text-sm font-bold tracking-wide text-background active:scale-[0.99]"
          >
            {t("salon.bookNow")} · {formatPrice(salon.priceFrom)}+
          </Link>
        </div>
      </div>
    </div>
  );
}
