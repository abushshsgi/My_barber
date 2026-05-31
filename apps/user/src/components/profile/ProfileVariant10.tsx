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
import { ProfileHubStack } from "@/components/profile/ProfileHubStack";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { formatBookingWhen } from "@/lib/bookings-utils";
import { formatPrice, userProfile, walletSummary } from "@/lib/mock-data";

const QUICK_SQUARES = [
  { to: "/map", icon: Map, labelKey: "nav.map" },
  { to: "/bookings", icon: CalendarCheck, labelKey: "nav.bookings" },
  { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { to: "/wallet", icon: Wallet, labelKey: "profile.wallet" },
] as const;

/** Variant 10 — bej band + kvadrat avatar + ustma-ust kartalar + kvadrat tugmalar. */
export function ProfileVariant10() {
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
    <div className="min-h-[70vh] overflow-hidden bg-background pb-8">
      <div className="bg-surface px-5 pb-14 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold">
            {audienceLabel}
          </span>
          <Link
            to="/settings"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-background active:opacity-80"
            aria-label={t("profile.settings")}
          >
            <Settings className="h-4 w-4" strokeWidth={2.2} />
          </Link>
        </div>
      </div>

      <div className="relative -mt-10 px-5">
        <div className="flex items-end gap-4">
          <div className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-2xl border-4 border-background bg-foreground text-2xl font-bold text-background shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-xl font-bold tracking-tight">{userProfile.name}</h1>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">{userProfile.phone}</p>
          </div>
        </div>

        <div className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1">
          {statLinks.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex w-[108px] shrink-0 snap-start flex-col rounded-2xl border border-border bg-card px-3 py-3 active:scale-[0.98] transition-transform"
            >
              <p className="text-2xl font-bold tabular-nums">{loading ? "—" : (s.value ?? 0)}</p>
              <p className="mt-1 text-[9px] font-bold uppercase leading-tight text-muted-foreground">
                {s.label}
              </p>
            </Link>
          ))}
        </div>

        <div className="relative mt-6">
          <Link
            to="/wallet"
            className="block rounded-2xl border border-border bg-surface/80 px-4 py-3 active:opacity-90"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" strokeWidth={2.2} />
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("profile.wallet")}
                </span>
              </div>
              <span className="text-sm font-bold tabular-nums">{formatPrice(walletSummary.balance)}</span>
            </div>
          </Link>

          {nextBooking && when ? (
            <Link
              to="/bookings"
              search={{ focus: nextBooking.id }}
              className="relative -mt-3 flex items-center gap-3 rounded-2xl border border-foreground bg-background p-4 shadow-md active:scale-[0.99] transition-transform"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface">
                <Calendar className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("profile.nextBooking.title")}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold">{nextBooking.salonName}</p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  {when.date} · {when.time}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ) : (
            <div className="relative -mt-3 rounded-2xl border border-dashed border-border bg-background p-4 text-center shadow-md">
              <p className="text-sm font-bold">{t("profile.nextBooking.empty")}</p>
              <Link to="/" className="mt-2 inline-block text-xs font-bold underline underline-offset-2">
                {t("profile.nextBooking.browse")}
              </Link>
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-4 gap-2">
          {QUICK_SQUARES.map(({ to, icon: Icon, labelKey }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 active:opacity-70"
            >
              <div className="grid h-[52px] w-full place-items-center rounded-xl border-2 border-foreground bg-background">
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="text-center text-[9px] font-bold leading-tight text-muted-foreground">
                {t(labelKey)}
              </span>
            </Link>
          ))}
        </div>

        <ProfileHubStack />
      </div>
    </div>
  );
}
