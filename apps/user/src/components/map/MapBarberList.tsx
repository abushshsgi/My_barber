import { Link } from "@tanstack/react-router";
import { Star, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BarberDiscovery } from "@/lib/mappers/barber";
import { formatDistanceKm } from "@/lib/map-utils";
import { shortPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  barbers: BarberDiscovery[];
  activeId: string;
  onActiveChange: (id: string) => void;
  onHover?: (id: string | null) => void;
  loading?: boolean;
  emptyMessage?: string;
};

export function MapBarberList({
  barbers,
  activeId,
  onActiveChange,
  onHover,
  loading,
  emptyMessage,
}: Props) {
  const { t } = useTranslation();

  if (loading) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  if (barbers.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? t("map.emptyBarbers", { defaultValue: "Yaqin atrofda usta topilmadi" })}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {barbers.map((b) => {
        const active = b.id === activeId;
        const bookTo =
          b.bookingKind === "salon" && b.salonId
            ? `/booking/${b.salonId}?barber=${b.barberId}`
            : `/booking/barber/${b.barberId}`;
        return (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onActiveChange(b.id)}
              onMouseEnter={() => onHover?.(b.id)}
              onMouseLeave={() => onHover?.(null)}
              className={cn(
                "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface",
                active && "bg-surface",
              )}
            >
              <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                {b.avatar ? (
                  <img src={b.avatar} alt="" className="size-full object-cover" />
                ) : (
                  <User className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-bold">{b.name}</p>
                  {b.priceFrom > 0 ? (
                    <span className="shrink-0 text-sm font-bold">{shortPrice(b.priceFrom)}</span>
                  ) : null}
                </div>
                {b.salonName ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{b.salonName}</p>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {b.rating > 0 ? (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                      <Star className="size-3 fill-foreground" />
                      {b.rating.toFixed(1)}
                    </span>
                  ) : null}
                  {b.distanceKm > 0 ? <span>{formatDistanceKm(b.distanceKm)}</span> : null}
                </div>
              </div>
            </button>
            <div className="px-4 pb-3">
              <Link
                to={bookTo}
                className="inline-flex rounded-xl bg-foreground px-4 py-2 text-xs font-bold text-background"
              >
                {t("map.bookBarber", { defaultValue: "Bron qilish" })}
              </Link>
              <Link
                to="/barber/$barberId"
                params={{ barberId: b.barberId }}
                className="ml-2 inline-flex rounded-xl border border-border px-4 py-2 text-xs font-bold"
              >
                {t("map.viewProfile", { defaultValue: "Profil" })}
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
