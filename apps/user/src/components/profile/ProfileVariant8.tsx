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
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { formatBookingWhen } from "@/lib/bookings-utils";
import { formatPrice, userProfile, walletSummary } from "@/lib/mock-data";
import { ProfileAccountBento } from "@/components/profile/ProfileAccountBento";

const QUICK_ACTIONS = [
  { to: "/map", icon: Map, labelKey: "nav.map" },
  { to: "/bookings", icon: CalendarCheck, labelKey: "nav.bookings" },
  { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { to: "/wallet", icon: Wallet, labelKey: "profile.wallet" },
] as const;

/** Variant 8 — qora hero + krem sheet + 4 doira + bento grid. */
export function ProfileVariant8() {
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
    <div className="min-h-[70vh] overflow-hidden bg-background">
      <header className="relative bg-foreground px-5 pb-16 pt-10 text-background">
        <Link
          to="/wallet"
          className="absolute left-5 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/15 px-3 py-1.5 text-[11px] font-bold"
        >
          <Wallet className="h-3.5 w-3.5" />
          {formatPrice(walletSummary.balance)}
        </Link>
        <Link
          to="/settings"
          className="absolute right-5 top-4 grid h-9 w-9 place-items-center rounded-full bg-background/15"
          aria-label={t("profile.settings")}
        >
          <Settings className="h-4 w-4" />
        </Link>

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-background text-3xl font-bold text-foreground">
            {initials}
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight">{userProfile.name}</h1>
          <p className="mt-1 text-xs font-medium text-background/65">{userProfile.phone}</p>
          <span className="mt-3 rounded-full bg-background/15 px-3 py-1 text-[11px] font-bold">
            {audienceLabel}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-3 divide-x divide-background/20">
          {statLinks.map((s) => (
            <Link key={s.to} to={s.to} className="px-2 py-1 text-center active:opacity-70">
              <p className="text-2xl font-bold tabular-nums">{loading ? "—" : (s.value ?? 0)}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-background/50">
                {s.label}
              </p>
            </Link>
          ))}
        </div>
      </header>

      <div className="relative -mt-10 rounded-t-[32px] bg-background px-5 pb-8 pt-6">
        {nextBooking && when ? (
          <Link
            to="/bookings"
            search={{ focus: nextBooking.id }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm active:scale-[0.99] transition-transform"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface">
              <Calendar className="h-5 w-5 text-foreground" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("profile.nextBooking.title")}
              </p>
              <p className="mt-0.5 truncate text-sm font-bold text-foreground">{nextBooking.salonName}</p>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                {when.date} · {when.time}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-center">
            <p className="text-sm font-bold">{t("profile.nextBooking.empty")}</p>
            <Link to="/" className="mt-2 inline-block text-xs font-bold underline underline-offset-2">
              {t("profile.nextBooking.browse")}
            </Link>
          </div>
        )}

        <div className="mt-8 flex justify-between gap-2 px-1">
          {QUICK_ACTIONS.map(({ to, icon: Icon, labelKey }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-2.5 active:opacity-70"
            >
              <div className="grid h-[56px] w-[56px] place-items-center rounded-full bg-foreground text-background shadow-sm">
                <Icon className="h-[22px] w-[22px]" strokeWidth={2.2} />
              </div>
              <span className="text-center text-[11px] font-bold leading-tight text-foreground">
                {t(labelKey)}
              </span>
            </Link>
          ))}
        </div>

        <ProfileAccountBento />
      </div>
    </div>
  );
}
