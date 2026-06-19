import { Link } from "@tanstack/react-router";
import { Calendar, Heart, TrendingUp, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { useBookings } from "@/hooks/use-bookings-api";
import { useFavorites } from "@/hooks/use-favorites";
import { useWalletBalance } from "@/hooks/use-wallet";
import { getUpcomingBookings } from "@/lib/bookings-utils";
import { cn } from "@/lib/utils";

type Props = { data: HomeData };

/** Hub — Linear: KPI + jadval qatorlar */
export function HomeHub({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, loading } = data;
  const { data: bookings = [] } = useBookings();
  const { ids: favIds } = useFavorites();
  const { balance } = useWalletBalance();
  const upcoming = getUpcomingBookings(bookings, Date.now());

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("home.title")}</h1>
          <p className="text-sm text-muted-foreground">Overview · {new Date().toLocaleDateString("uz-UZ")}</p>
        </div>
        <Link to="/today" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          + {t("homePage.quick.today")}
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Calendar, label: t("nav.bookings"), value: upcoming.length },
          { icon: Heart, label: t("nav.favorites"), value: favIds.length },
          { icon: Wallet, label: t("nav.wallet"), value: `${Math.round(balance / 1000)}k` },
          { icon: TrendingUp, label: "Salonlar", value: filtered.length },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-surface/30 p-4">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        {data.visibleCategoryKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => data.setCat(key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium",
              data.effectiveCat === key ? "bg-neutral-900 text-white" : "bg-surface text-muted-foreground",
            )}
          >
            {t(`home.categories.${key}`)}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[1fr_120px_100px_80px] gap-4 border-b border-border bg-surface/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          <span>Salon</span>
          <span>Kategoriya</span>
          <span>Reyting</span>
          <span>Narx</span>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          filtered.slice(0, 12).map((salon) => (
            <div key={salon.id} className="border-b border-border last:border-0">
              <DesktopSalonCard salon={salon} variant="row" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
