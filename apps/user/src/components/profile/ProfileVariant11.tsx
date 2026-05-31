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

const SHORTCUTS = [
  { to: "/map", icon: Map, labelKey: "nav.map" },
  { to: "/bookings", icon: CalendarCheck, labelKey: "nav.bookings" },
  { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
] as const;

/**
 * Variant 11 — markaziy ID karta + story halqalar + pastda qora panel.
 * V8 (qora yuqori), V9 (dashboard), V10 (bej band) dan farqli.
 */
export function ProfileVariant11() {
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
    <div className="flex min-h-[78vh] flex-col bg-background">
      <div className="flex-1 px-5 pb-6 pt-[calc(env(safe-area-inset-top)+10px)]">
        <div className="flex justify-end">
          <Link
            to="/settings"
            className="grid h-10 w-10 place-items-center rounded-full bg-surface active:opacity-80"
            aria-label={t("profile.settings")}
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </Link>
        </div>

        <div className="mx-auto mt-2 w-full max-w-[320px]">
          <div className="rounded-[28px] bg-foreground p-6 text-background shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-background/50">
                mysaloon.uz
              </p>
              <span className="rounded-full bg-background/15 px-2.5 py-1 text-[10px] font-bold">
                {audienceLabel}
              </span>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-background text-xl font-bold text-foreground">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold leading-tight">{userProfile.name}</p>
                <p className="mt-1 text-xs font-medium text-background/60">{userProfile.phone}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-background/15 pt-4">
              {statLinks.map((s, i) => (
                <Link key={s.to} to={s.to} className="flex-1 text-center active:opacity-70">
                  <p className="text-xl font-bold tabular-nums">{loading ? "—" : (s.value ?? 0)}</p>
                  <p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-background/45">
                    {s.label}
                  </p>
                  {i < statLinks.length - 1 && (
                    <span className="sr-only">·</span>
                  )}
                </Link>
              ))}
            </div>

            <Link
              to="/wallet"
              className="mt-4 flex items-center justify-between rounded-2xl bg-background/10 px-4 py-3 active:bg-background/15"
            >
              <span className="flex items-center gap-2 text-xs font-bold">
                <Wallet className="h-4 w-4" strokeWidth={2.2} />
                {t("profile.wallet")}
              </span>
              <span className="text-sm font-bold tabular-nums">{formatPrice(walletSummary.balance)}</span>
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t("profile.variant11.hubs")}
          </p>
          <div className="flex justify-center gap-5">
            {ACCOUNT_HUBS.map((hub) => {
              const Icon = hub.icon;
              const short = t(hub.titleKey).split(" ")[0] ?? t(hub.titleKey);
              return (
                <Link
                  key={hub.key}
                  to={hub.to as never}
                  className="flex w-[68px] flex-col items-center gap-2 active:opacity-70"
                >
                  <div className="rounded-full bg-gradient-to-br from-foreground to-foreground/70 p-[2.5px]">
                    <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-background">
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                  </div>
                  <span className="line-clamp-2 text-center text-[9px] font-bold leading-tight">
                    {short}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-t-[32px] bg-foreground px-5 pb-8 pt-6 text-background">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/45">
          {t("profile.variant11.upcoming")}
        </p>

        {nextBooking && when ? (
          <Link
            to="/bookings"
            search={{ focus: nextBooking.id }}
            className="mt-4 flex gap-4 active:opacity-80"
          >
            <div className="flex flex-col items-center">
              <div className="grid h-3 w-3 rounded-full bg-background" />
              <div className="mt-1 w-px flex-1 bg-background/20" />
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <p className="text-base font-bold leading-tight">{nextBooking.salonName}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-background/65">
                <Calendar className="h-3.5 w-3.5" />
                {when.date} · {when.time}
              </p>
            </div>
          </Link>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-background/25 px-4 py-5 text-center">
            <p className="text-sm font-bold">{t("profile.nextBooking.empty")}</p>
            <Link to="/" className="mt-2 inline-block text-xs font-bold underline underline-offset-2">
              {t("profile.nextBooking.browse")}
            </Link>
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2">
          {SHORTCUTS.map(({ to, icon: Icon, labelKey }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 rounded-2xl bg-background/10 py-4 active:bg-background/15"
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              <span className="text-[10px] font-bold">{t(labelKey)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
