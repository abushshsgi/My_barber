import { Link } from "@tanstack/react-router";
import {
  Calendar,
  CalendarCheck,
  ChevronRight,
  Map,
  MessageSquare,
  Settings,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileHubEqualGrid } from "@/components/profile/ProfileHubEqualGrid";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { formatBookingWhen } from "@/lib/bookings-utils";
import { formatPrice, userProfile, walletSummary } from "@/lib/mock-data";

const QUICK_PILLS = [
  { to: "/map", icon: Map, labelKey: "nav.map" },
  { to: "/bookings", icon: CalendarCheck, labelKey: "nav.bookings" },
  { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { to: "/wallet", icon: Wallet, labelKey: "profile.wallet" },
] as const;

/** Variant 9 — yorug' dashboard: gorizontal identity, pill tugmalar, teng hub grid. */
export function ProfileVariant9() {
  const { t } = useTranslation();
  const { audience, stats, loading, nextBooking } = useProfileScreen();
  const audienceLabel = t(`audience.${audience}`);
  const initials = userProfile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const statLinks = [
    { label: t("profile.bookings"), value: stats?.bookingsCount, to: "/bookings" },
    { label: t("profile.reviews"), value: stats?.reviewsCount, to: "/reviews" },
    { label: t("profile.favorites"), value: stats?.favoritesCount, to: "/favorites" },
  ];

  const when = nextBooking ? formatBookingWhen(nextBooking.date) : null;

  return (
    <div className="min-h-[70vh] bg-background px-5 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold leading-none tracking-tight">{t("profile.title")}</h1>
        <Link
          to="/settings"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background active:bg-surface"
          aria-label={t("profile.settings")}
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-2xl bg-foreground text-2xl font-bold text-background">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{userProfile.name}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{userProfile.phone}</p>
          <span className="mt-2 inline-block rounded-full bg-surface px-2.5 py-1 text-[10px] font-bold">
            {audienceLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/wallet"
          className="flex flex-col justify-between rounded-2xl bg-foreground p-4 text-background active:scale-[0.98] transition-transform"
        >
          <Wallet className="h-5 w-5 opacity-80" strokeWidth={2.2} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-background/55">
              {t("profile.wallet")}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatPrice(walletSummary.balance)}</p>
          </div>
        </Link>

        <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-surface/50">
          {statLinks.map((s) => (
            <Link key={s.to} to={s.to} className="flex flex-col items-center justify-center px-1 py-3 active:bg-surface">
              <p className="text-lg font-bold tabular-nums">{loading ? "—" : (s.value ?? 0)}</p>
              <p className="mt-1 text-center text-[8px] font-bold uppercase leading-tight text-muted-foreground">
                {s.label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {nextBooking && when ? (
        <Link
          to="/bookings"
          search={{ focus: nextBooking.id }}
          className="mt-4 flex items-center gap-3 rounded-2xl bg-foreground p-4 text-background active:scale-[0.99] transition-transform"
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background/15">
            <Calendar className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-background/55">
              {t("profile.nextBooking.title")}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold">{nextBooking.salonName}</p>
            <p className="mt-0.5 text-[11px] font-medium text-background/70">
              {when.date} · {when.time}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-background/60" />
        </Link>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/40 p-4 text-center">
          <p className="text-sm font-bold">{t("profile.nextBooking.empty")}</p>
          <Link to="/" className="mt-2 inline-block text-xs font-bold underline underline-offset-2">
            {t("profile.nextBooking.browse")}
          </Link>
        </div>
      )}

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-0.5">
        {QUICK_PILLS.map(({ to, icon: Icon, labelKey }) => (
          <Link
            key={to}
            to={to}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-[12px] font-bold active:bg-surface"
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
            {t(labelKey)}
          </Link>
        ))}
      </div>

      <ProfileHubEqualGrid />
    </div>
  );
}
