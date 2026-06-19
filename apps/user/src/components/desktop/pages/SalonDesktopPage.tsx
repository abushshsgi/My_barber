import { Link } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Plus, Share2, Star, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { DesktopPageHeader } from "@/components/desktop/ui/DesktopPageHeader";
import { useFavorites } from "@/hooks/use-favorites";
import { useSalonPage } from "@/hooks/use-salon-page";
import { cn } from "@/lib/utils";

const TAB_KEYS = ["about", "services", "staff", "reviews", "portfolio"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export function SalonDesktopPage() {
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
    <div>
      <div className="relative aspect-[21/9] overflow-hidden rounded-2xl">
        <img
          src={salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        <div className="absolute inset-x-0 bottom-0 p-8 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{salon.category}</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight">{salon.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm font-bold">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-white" />
              {salon.rating} ({salon.reviewCount})
            </span>
            <span className="opacity-50">·</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {salon.distanceKm} km
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground">
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => toggle(salon.id)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground"
            >
              <Heart className={cn("h-4 w-4", fav && "fill-foreground")} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_360px] gap-8 items-start">
        <div>
          <div className="border-b border-border">
            <div className="flex gap-1">
              {TAB_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={cn(
                    "relative px-3 py-3.5 text-sm font-bold",
                    tab === k ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(`salon.tabs.${k}`)}
                  {tab === k ? (
                    <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-foreground" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6">
            {tab === "about" && (
              <div className="space-y-5">
                <p className="text-base leading-relaxed">{salon.about}</p>
                <div className="rounded-2xl bg-surface p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Manzil</p>
                  <p className="mt-1 text-sm font-bold">{salon.address}</p>
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
                        className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background"
                      >
                        <Plus className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === "staff" && (
              <div className="grid grid-cols-3 gap-3">
                {salon.staff.map((b) => (
                  <div key={b.id} className="rounded-2xl bg-surface p-4 text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-foreground text-lg font-bold text-background">
                      {b.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <p className="mt-3 text-sm font-bold">{b.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{b.role}</p>
                  </div>
                ))}
              </div>
            )}
            {tab === "reviews" && (
              <div className="grid grid-cols-2 gap-4">
                {salon.reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-surface p-4">
                    <p className="text-sm font-bold">{r.author}</p>
                    <p className="mt-2 text-sm">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
            {tab === "portfolio" && (
              <div className="grid grid-cols-4 gap-2">
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

        <aside className="sticky top-24 rounded-2xl border border-border bg-surface/30 p-5">
          <DesktopPageHeader title={t("salon.bookNow")} />
          <p className="mt-2 text-2xl font-bold tabular-nums">{formatPrice(salon.priceFrom)}+</p>
          <p className="mt-4 flex items-start gap-2 text-sm font-medium">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{salon.address}</span>
          </p>
          <Link
            to="/booking/$salonId"
            params={{ salonId: salon.id }}
            className="mt-5 flex w-full items-center justify-center rounded-2xl bg-foreground py-4 text-sm font-bold text-background"
          >
            {t("salon.bookNow")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
