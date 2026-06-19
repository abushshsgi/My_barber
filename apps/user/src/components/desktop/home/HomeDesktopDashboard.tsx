import { Link } from "@tanstack/react-router";
import { Calendar, Heart, Map, Sparkles, Tag, Wallet, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { useBookings } from "@/hooks/use-bookings-api";
import { useFavorites } from "@/hooks/use-favorites";
import { useWalletBalance } from "@/hooks/use-wallet";
import { getUpcomingBookings } from "@/lib/bookings-utils";

type Props = { data: HomeData };

const QUICK_ACTIONS = [
  { to: "/today", labelKey: "homePage.quick.today", icon: Calendar },
  { to: "/map", labelKey: "nav.map", icon: Map },
  { to: "/ai-style", labelKey: "homePage.quick.aiStyle", icon: Wand2 },
  { to: "/offers", labelKey: "nav.offers", icon: Tag },
  { to: "/explore", labelKey: "nav.explore", icon: Sparkles },
  { to: "/bookings", labelKey: "nav.bookings", icon: Calendar },
] as const;

export function HomeDesktopDashboard({ data }: Props) {
  const { t } = useTranslation();
  const { data: bookings = [] } = useBookings();
  const { ids: favoriteIds } = useFavorites();
  const { balance } = useWalletBalance();
  const upcoming = getUpcomingBookings(bookings, Date.now());

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("home.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("homePage.editorialTagline")}</p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("nav.bookings")}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{upcoming.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("nav.favorites")}</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-bold tabular-nums">
            <Heart className="h-6 w-6" /> {favoriteIds.length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("nav.wallet")}</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-bold tabular-nums">
            <Wallet className="h-6 w-6" /> {balance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-6 gap-3">
        {QUICK_ACTIONS.map(({ to, labelKey, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background p-4 text-center transition-colors hover:bg-surface"
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] font-bold leading-tight">{t(labelKey)}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-[1fr_320px] gap-6">
        <section>
          <h2 className="mb-4 text-lg font-bold">{t("home.nearby")}</h2>
          <div className="space-y-3">
            {data.filtered.slice(0, 8).map((s) => (
              <DesktopSalonCard key={s.id} salon={s} variant="row" />
            ))}
          </div>
        </section>
        <aside className="space-y-4">
          <Link to="/ai-style" className="block rounded-2xl border border-border p-5">
            <Wand2 className="h-5 w-5" />
            <p className="mt-3 font-bold">{t("homePage.aiPromoTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("homePage.aiPromoHint")}</p>
          </Link>
          <Link to="/today" className="block rounded-2xl bg-foreground p-5 text-background">
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{t("homePage.quick.today")}</p>
            <p className="mt-2 text-sm font-bold">{t("common.viewAll")}</p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
