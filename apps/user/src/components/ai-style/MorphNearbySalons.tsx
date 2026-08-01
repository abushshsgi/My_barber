import { Link } from "@tanstack/react-router";
import { CalendarPlus, MapPin, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRecommendContext } from "@/hooks/use-recommend-context";
import { useSalonsNearby } from "@/hooks/use-salons";
import { PLACEHOLDER_SALON } from "@/lib/cover-images";
import { cn } from "@/lib/utils";

type Props = {
  /** Prefer this salon first when present (AI-attached). */
  preferredSalonId?: string;
  className?: string;
};

/** Nearby salons to book after a Morph try-on. */
export function MorphNearbySalons({ preferredSalonId, className }: Props) {
  const { t } = useTranslation();
  const ctx = useRecommendContext();
  const nearbyQ = useSalonsNearby(ctx.lat, ctx.lng, 20, ctx.lat != null && ctx.lng != null);
  const salons = nearbyQ.data ?? [];

  const ranked = (() => {
    if (!salons.length) return [];
    const list = [...salons];
    if (preferredSalonId) {
      list.sort((a, b) => {
        if (a.id === preferredSalonId) return -1;
        if (b.id === preferredSalonId) return 1;
        return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
      });
    } else {
      list.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    }
    return list.slice(0, 4);
  })();

  if (!ranked.length) {
    if (nearbyQ.isLoading) {
      return (
        <div className={cn("space-y-2", className)}>
          <p className="text-[12px] font-bold text-neutral-500">
            {t("aiStylePage.nearbyBook.title", { defaultValue: "Yaqin salonlarda kesib oling" })}
          </p>
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 w-[9.5rem] shrink-0 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className={cn("rounded-2xl border border-border bg-neutral-50 px-4 py-3", className)}>
        <p className="text-[13px] font-bold text-foreground">
          {t("aiStylePage.nearbyBook.title", { defaultValue: "Yaqin salonlarda kesib oling" })}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {t("aiStylePage.nearbyBook.empty", {
            defaultValue: "Yaqin salonlarni ko‘rish uchun xaritani oching",
          })}
        </p>
        <Link
          to="/map"
          className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-bold text-foreground underline-offset-2 hover:underline"
        >
          <MapPin className="size-3.5" />
          {t("aiStylePage.nearbyBook.openMap", { defaultValue: "Xaritani ochish" })}
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-foreground">
          {t("aiStylePage.nearbyBook.title", { defaultValue: "Yaqin salonlarda kesib oling" })}
        </p>
        <Link
          to="/map"
          className="cursor-pointer text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          {t("aiStylePage.nearbyBook.openMap", { defaultValue: "Xarita" })}
        </Link>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
        {ranked.map((salon) => (
          <Link
            key={salon.id}
            to="/booking/$salonId"
            params={{ salonId: salon.id }}
            className="flex w-[11.5rem] shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-white transition-opacity duration-200 active:opacity-90"
          >
            <img
              src={salon.coverUrl || PLACEHOLDER_SALON}
              alt=""
              className="h-16 w-full object-cover"
            />
            <div className="flex flex-1 flex-col gap-1 px-2.5 py-2">
              <p className="truncate text-[12px] font-bold leading-tight text-foreground">{salon.name}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                {salon.rating > 0 ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Star className="size-2.5 fill-current text-amber-500" />
                    {salon.rating.toFixed(1)}
                  </span>
                ) : null}
                {salon.distanceKm > 0 ? <span>{salon.distanceKm.toFixed(1)} km</span> : null}
              </div>
              <span className="mt-auto inline-flex items-center justify-center gap-1 rounded-xl bg-black px-2 py-1.5 text-[11px] font-bold text-white">
                <CalendarPlus className="size-3" />
                {t("aiStylePage.bookShort")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
