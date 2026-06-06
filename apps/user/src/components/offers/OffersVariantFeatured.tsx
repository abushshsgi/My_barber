import { Link } from "@tanstack/react-router";
import { CalendarPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  filterOffers,
  pickFeatured,
  salonCoverGradient,
  salonForOffer,
  type OfferFilter,
} from "@/components/offers/offers-shared";
import type { Offer } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = { list: Offer[] };

export function OffersVariantFeatured({ list }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<OfferFilter>("all");

  const featured = useMemo(() => pickFeatured(list), [list]);
  const filtered = useMemo(() => filterOffers(list, filter), [list, filter]);

  const filters: { key: OfferFilter; label: string }[] = [
    { key: "all", label: t("offersPage.filters.all") },
    { key: "ending", label: t("offersPage.filters.ending") },
    { key: "nearby", label: t("offersPage.filters.nearby") },
  ];

  return (
    <div className="space-y-5">
      {featured ? (
        <Link
          to="/salon/$id"
          params={{ id: featured.salonId }}
          className="block overflow-hidden rounded-[24px] bg-foreground p-5 text-background active:scale-[0.98] transition-transform"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-background/55">
            {t("offersPage.featuredLabel")}
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight">{featured.title}</p>
              <p className="mt-1 truncate text-xs font-medium text-background/65">
                {featured.salonName} · {t("offersPage.validUntil", { date: featured.validUntil })}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-background px-3 py-1.5 text-sm font-bold text-foreground">
              −{featured.discountPct}%
            </span>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-background/12 px-3 py-1.5 text-[11px] font-bold text-background">
            <CalendarPlus className="h-3.5 w-3.5" />
            {t("offersPage.bookNow")}
          </span>
        </Link>
      ) : null}

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-3.5 py-2 text-[11px] font-bold transition-colors",
              filter === f.key ? "bg-foreground text-background" : "bg-surface text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((o) => {
          const salon = salonForOffer(o.salonId);
          const seed = salon?.coverSeed ?? o.salonId;
          return (
            <Link
              key={o.id}
              to="/salon/$id"
              params={{ id: o.salonId }}
              className="block overflow-hidden rounded-[22px] border border-border bg-background active:scale-[0.99] transition-transform"
            >
              <div className="relative h-28" style={{ background: salonCoverGradient(seed) }}>
                <span className="absolute left-3 top-3 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold text-background">
                  −{o.discountPct}%
                </span>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {o.salonName}
                  {salon ? ` · ${salon.distanceKm} km` : ""}
                </p>
                <h3 className="mt-0.5 text-sm font-bold">{o.title}</h3>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                  {t("offersPage.validUntil", { date: o.validUntil })}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
