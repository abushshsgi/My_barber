import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Star, MapPin, Share2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { PageHeader } from "@/components/PageHeader";
import { StickyAside } from "@/components/layout/StickyAside";
import { useFavorites } from "@/hooks/use-favorites";
import { useSalonPage } from "@/hooks/use-salon-page";
import { DESKTOP_SIDEBAR_LEFT_CLASS } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salon/$id")({
  head: () => ({
    meta: [{ title: "Salon — mysaloon.uz" }],
  }),
  component: SalonPage,
});

const TAB_KEYS = ["about", "services", "staff", "reviews", "portfolio"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function SalonBookingAside({ salonId, priceFrom, address, distanceKm }: {
  salonId: string;
  priceFrom: number;
  address: string;
  distanceKm: number;
}) {
  const { t } = useTranslation();
  return (
    <StickyAside className="hidden lg:block lg:w-[360px] lg:shrink-0">
      <div className="rounded-2xl border border-border bg-surface/30 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("salon.bookNow")}
        </p>
        <p className="mt-2 text-2xl font-bold tabular-nums">{formatPrice(priceFrom)}+</p>
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="flex items-start gap-2 text-sm font-medium">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{address}</span>
          </p>
          <p className="text-xs text-muted-foreground">{distanceKm} km</p>
        </div>
        <Link
          to="/booking/$salonId"
          params={{ salonId }}
          className="mt-5 flex w-full items-center justify-center rounded-2xl bg-foreground py-4 text-sm font-bold text-background transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          {t("salon.bookNow")}
        </Link>
      </div>
    </StickyAside>
  );
}

function SalonPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/salon/$id" });
  const { salon, isLoading } = useSalonPage(id);
  const { isFav, toggle } = useFavorites();
  const [tab, setTab] = useState<TabKey>("services");

  if (isLoading || !salon) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const fav = isFav(salon.id);

  return (
    <div className="pb-32 lg:pb-8 lg:px-6">
      <div className="relative aspect-[4/5] w-full overflow-hidden lg:aspect-[21/9] lg:rounded-2xl">
        <img
          src={salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />

        <div className="absolute inset-x-0 top-0 lg:hidden">
          <PageHeader
            showBack
            transparent
            right={
              <>
                <button className="grid h-10 w-10 place-items-center rounded-full bg-background/90 backdrop-blur active:scale-95">
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggle(salon.id)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-background/90 backdrop-blur active:scale-95"
                >
                  <Heart className={cn("h-4 w-4", fav && "fill-foreground")} strokeWidth={2} />
                </button>
              </>
            }
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 text-background lg:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{salon.category}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">{salon.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs font-bold lg:text-sm">
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
          <div className="mt-4 hidden gap-2 lg:flex">
            <button className="grid h-10 w-10 place-items-center rounded-full bg-background/90 text-foreground backdrop-blur">
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggle(salon.id)}
              className="grid h-10 w-10 place-items-center rounded-full bg-background/90 text-foreground backdrop-blur"
            >
              <Heart className={cn("h-4 w-4", fav && "fill-foreground")} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <div className="lg:mt-8 lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start">
        <div className="min-w-0">
          <div className="sticky top-14 z-20 -mt-px border-b border-border bg-background/95 backdrop-blur-md lg:top-14 lg:rounded-t-2xl">
            <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 lg:px-0">
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

          <div className="px-5 pt-6 lg:px-0">
            {tab === "about" && (
              <div className="space-y-5">
                <p className="text-sm leading-relaxed lg:text-base">{salon.about}</p>
                <div className="rounded-2xl bg-surface p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Manzil</p>
                  <p className="mt-1 text-sm font-bold">{salon.address}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{salon.distanceKm} km uzoqlikda</p>
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
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
              <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
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
              <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
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
        </div>

        <SalonBookingAside
          salonId={salon.id}
          priceFrom={salon.priceFrom}
          address={salon.address}
          distanceKm={salon.distanceKm}
        />
      </div>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 pt-3 backdrop-blur-md lg:hidden",
          DESKTOP_SIDEBAR_LEFT_CLASS,
        )}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        <div className="mx-auto max-w-[480px]">
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
