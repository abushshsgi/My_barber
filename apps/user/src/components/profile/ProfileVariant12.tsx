import { Link } from "@tanstack/react-router";
import {
  Calendar,
  CalendarCheck,
  Map,
  MessageSquare,
  Settings,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ACCOUNT_HUBS } from "@/lib/account-hubs";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { formatBookingWhen } from "@/lib/bookings-utils";
import { formatPrice, userProfile, walletSummary } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const NAV_TILES = [
  { to: "/map", icon: Map, labelKey: "nav.map", dark: false },
  { to: "/chat", icon: MessageSquare, labelKey: "nav.chat", dark: true },
] as const;

/**
 * Variant 12 — Metro plitka grid: turli o'lchamli kvadratlar, hero/sheet/ID yo'q.
 */
export function ProfileVariant12() {
  const { t } = useTranslation();
  const { audience, stats, loading, nextBooking } = useProfileScreen();
  const audienceLabel = t(`audience.${audience}`);
  const initials = userProfile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const when = nextBooking ? formatBookingWhen(nextBooking.date) : null;
  const hubTiles = ACCOUNT_HUBS.map((hub) => ({
    ...hub,
    short: t(hub.titleKey).split(" ")[0] ?? t(hub.titleKey),
  }));

  return (
    <div className="min-h-[70vh] bg-surface px-4 pb-8 pt-[calc(env(safe-area-inset-top)+10px)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-foreground text-sm font-bold text-background">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{userProfile.name}</p>
          <p className="text-[11px] font-medium text-muted-foreground">{audienceLabel}</p>
        </div>
        <Link
          to="/settings"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background active:opacity-80"
          aria-label={t("profile.settings")}
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 auto-rows-[minmax(84px,auto)]">
        {nextBooking && when ? (
          <Link
            to="/bookings"
            search={{ focus: nextBooking.id }}
            className="col-span-2 row-span-2 flex flex-col justify-between rounded-2xl bg-foreground p-4 text-background active:opacity-95"
          >
            <Calendar className="h-6 w-6 opacity-70" strokeWidth={2} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-background/50">
                {t("profile.nextBooking.title")}
              </p>
              <p className="mt-1 line-clamp-2 text-lg font-bold leading-tight">{nextBooking.salonName}</p>
              <p className="mt-2 text-xs font-medium text-background/70">
                {when.date} · {when.time}
              </p>
            </div>
          </Link>
        ) : (
          <Link
            to="/"
            className="col-span-2 row-span-2 flex flex-col justify-center rounded-2xl border-2 border-dashed border-border bg-background p-4 text-center active:opacity-90"
          >
            <p className="text-sm font-bold">{t("profile.nextBooking.empty")}</p>
            <p className="mt-2 text-xs font-bold underline underline-offset-2">
              {t("profile.nextBooking.browse")}
            </p>
          </Link>
        )}

        <Link
          to="/wallet"
          className="flex flex-col justify-between rounded-2xl bg-background p-3 active:scale-[0.98] transition-transform"
        >
          <Wallet className="h-5 w-5 text-muted-foreground" strokeWidth={2.2} />
          <div>
            <p className="text-[9px] font-bold uppercase text-muted-foreground">{t("profile.wallet")}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums leading-tight">
              {formatPrice(walletSummary.balance)}
            </p>
          </div>
        </Link>

        <Link
          to="/bookings"
          className="flex flex-col justify-between rounded-2xl border border-border bg-background p-3 active:bg-surface"
        >
          <p className="text-2xl font-bold tabular-nums leading-none">{loading ? "—" : (stats?.bookingsCount ?? 0)}</p>
          <p className="text-[9px] font-bold uppercase leading-tight text-muted-foreground">
            {t("profile.bookings")}
          </p>
        </Link>

        <Link
          to="/reviews"
          className="flex flex-col justify-between rounded-2xl border border-border bg-background p-3 active:bg-surface"
        >
          <p className="text-2xl font-bold tabular-nums leading-none">{loading ? "—" : (stats?.reviewsCount ?? 0)}</p>
          <p className="text-[9px] font-bold uppercase leading-tight text-muted-foreground">
            {t("profile.reviews")}
          </p>
        </Link>

        <Link
          to="/favorites"
          className="col-span-3 flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 active:bg-surface"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("profile.favorites")}
          </span>
          <span className="text-xl font-bold tabular-nums">{loading ? "—" : (stats?.favoritesCount ?? 0)}</span>
        </Link>

        {hubTiles.map((hub, i) => {
          const Icon = hub.icon;
          const dark = i === 1 || i === 3;
          return (
            <Link
              key={hub.key}
              to={hub.to as never}
              className={cn(
                "flex flex-col justify-between rounded-2xl p-3 active:scale-[0.98] transition-transform",
                dark ? "bg-foreground text-background" : "border border-border bg-background",
              )}
            >
              <Icon className={cn("h-5 w-5", dark ? "opacity-80" : "text-muted-foreground")} strokeWidth={2.2} />
              <span className="text-[11px] font-bold leading-tight">{hub.short}</span>
            </Link>
          );
        })}

        {NAV_TILES.map(({ to, icon: Icon, labelKey, dark }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-start justify-between rounded-2xl p-3 active:scale-[0.98] transition-transform",
              dark ? "bg-foreground text-background" : "border border-border bg-background",
            )}
          >
            <Icon className={cn("h-5 w-5", dark ? "opacity-80" : "text-muted-foreground")} strokeWidth={2.2} />
            <span className="text-[11px] font-bold">{t(labelKey)}</span>
          </Link>
        ))}

        <Link
          to="/bookings"
          className="flex flex-col justify-between rounded-2xl border border-border bg-background p-3 active:bg-surface"
        >
          <CalendarCheck className="h-5 w-5 text-muted-foreground" strokeWidth={2.2} />
          <span className="text-[11px] font-bold">{t("nav.bookings")}</span>
        </Link>
      </div>
    </div>
  );
}
