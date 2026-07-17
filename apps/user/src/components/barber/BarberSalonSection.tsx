import { Link } from "@tanstack/react-router";
import { ChevronRight, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SalonCoverImg } from "@/components/salon/SalonCoverImg";
import { SalonReviewsList } from "@/components/salon/SalonReviewsList";
import { useSalonPage } from "@/hooks/use-salon-page";
import { resolveMediaUrl } from "@/lib/media-url";
import { prefetchSalonDetail } from "@/lib/prefetch-salon";

type Props = {
  salonId: string;
  salonName?: string | null;
  compact?: boolean;
};

/** Usta profilida bog‘langan salon: cover, portfolio preview, otzivlar. */
export function BarberSalonSection({ salonId, salonName, compact = false }: Props) {
  const { t } = useTranslation();
  const { salon, isLoading } = useSalonPage(salonId);

  const name = salon?.name || salonName || t("map.salons", { defaultValue: "Salon" });
  const portfolio = (salon?.portfolio ?? [])
    .map((u) => resolveMediaUrl(u) ?? u)
    .filter(Boolean)
    .slice(0, compact ? 4 : 6);
  const reviews = (salon?.reviews ?? []).slice(0, compact ? 2 : 3);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("barber.salonSection", { defaultValue: "Ishlagan salon" })}
        </h2>
        <Link
          to="/salon/$id"
          params={{ id: salonId }}
          preload="intent"
          onPointerEnter={() => prefetchSalonDetail(salonId)}
          onTouchStart={() => prefetchSalonDetail(salonId)}
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground"
        >
          {t("map.viewSalon", { defaultValue: "Salonni ko'rish" })}
          <ChevronRight className="size-3.5 opacity-70" />
        </Link>
      </div>

      <Link
        to="/salon/$id"
        params={{ id: salonId }}
        preload="intent"
        onPointerEnter={() => prefetchSalonDetail(salonId)}
        onTouchStart={() => prefetchSalonDetail(salonId)}
        className="flex gap-3 rounded-2xl border border-border/80 bg-surface p-2.5 active:opacity-95"
      >
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {salon ? (
            <SalonCoverImg
              src={salon.coverUrl}
              seed={salon.coverSeed}
              category={salon.category}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="size-full bg-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="truncate text-sm font-semibold">{isLoading ? "…" : name}</p>
          {salon?.address ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{salon.address}</p>
          ) : null}
          {salon && salon.rating > 0 ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold">
              <Star className="size-3 fill-foreground" />
              {salon.rating.toFixed(1)}
              {salon.reviewCount > 0 ? (
                <span className="font-normal text-muted-foreground">({salon.reviewCount})</span>
              ) : null}
            </p>
          ) : null}
        </div>
      </Link>

      {portfolio.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("salon.tabs.portfolio", { defaultValue: "Portfolio" })}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {portfolio.map((src) => (
              <Link
                key={src}
                to="/salon/$id"
                params={{ id: salonId }}
                className="aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("salon.reviews.ratingTitle", { defaultValue: "Otzivlar" })}
          </p>
          <SalonReviewsList reviews={reviews} compact />
        </div>
      ) : null}
    </section>
  );
}
