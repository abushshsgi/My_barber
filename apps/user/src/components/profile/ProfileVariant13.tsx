import { Link } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  ChevronRight,
  CreditCard,
  Headphones,
  Info,
  MapPin,
  Settings,
  Shield,
  Sparkles,
  Tag,
  Users,
  CalendarCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileGoMenuGroup, ProfileGoQuickRow, ProfileWalletCard } from "@/components/profile/ProfileGroupedMenu";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { formatBookingWhen } from "@/lib/bookings-utils";
import {
  formatPrice,
  getUserSubscription,
  loyaltyMock,
  paymentMethods,
  userProfile,
  walletSummary,
} from "@/lib/mock-data";

/** Profil — Yandex Go uslubi. */
export function ProfileVariant13() {
  const { t } = useTranslation();
  const { audience, nextBooking } = useProfileScreen();
  const audienceLabel = t(`audience.${audience}`);
  const initials = userProfile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const primaryPayment = paymentMethods.find((p) => p.primary) ?? paymentMethods[0];
  const userPlan = getUserSubscription();
  const when = nextBooking ? formatBookingWhen(nextBooking.date) : null;

  const quickItems = [
    { icon: CalendarCheck, label: t("profile.bookings"), to: "/bookings" },
    { icon: Headphones, label: t("profile.support"), to: "/support" },
    { icon: MapPin, label: t("profile.addresses"), to: "/addresses" },
    { icon: Settings, label: t("profile.settings"), to: "/settings" },
  ];

  return (
    <div className="min-h-[70vh] bg-background pb-4 pt-[calc(env(safe-area-inset-top)+6px)]">
      <div className="flex items-center justify-between px-5">
        <Link
          to="/loyalty"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1.5 active:opacity-80"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
          <span className="text-[12px] font-bold leading-none">{loyaltyMock.tier}</span>
          <span className="text-[10px] font-medium text-muted-foreground">
            · {loyaltyMock.points}
          </span>
        </Link>

        <Link
          to="/subscriptions"
          className="inline-flex max-w-[140px] items-center rounded-full bg-surface px-2.5 py-1.5 active:opacity-80"
        >
          <span className="truncate text-[12px] font-bold leading-none">
            {userPlan ? userPlan.name : t("profile.upgrade")}
          </span>
        </Link>
      </div>

      <div className="mt-2 flex flex-col items-center px-5 text-center">
        <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-surface">
          <span className="text-[36px] font-bold leading-none">{initials}</span>
        </div>
        <Link to="/settings" className="mt-4 inline-flex max-w-full items-center gap-1 active:opacity-70">
          <p className="truncate text-[22px] font-bold tracking-tight">{userProfile.name}</p>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
        </Link>
        <p className="mt-1 text-[15px] font-medium text-muted-foreground">{userProfile.phone}</p>
        <span className="mt-2 rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-muted-foreground">
          {audienceLabel}
        </span>
      </div>

      <div className="mt-7 px-3">
        <ProfileGoQuickRow items={quickItems} />
      </div>

      <div className="mt-6 space-y-3 px-4">
        <ProfileWalletCard title={t("profile.wallet")} balance={formatPrice(walletSummary.balance)} />

        <ProfileGoMenuGroup
          items={[
            {
              icon: Tag,
              title: t("profile.offers"),
              subtitle: t("profile.promoHint"),
              to: "/offers",
            },
            {
              icon: CreditCard,
              title: t("paymentMethods.title"),
              subtitle: `${primaryPayment.label} ${primaryPayment.detail}`,
              to: "/payment-methods",
            },
          ]}
        />

        {nextBooking && when ? (
          <ProfileGoMenuGroup
            dark
            items={[
              {
                icon: Calendar,
                title: t("profile.nextBooking.title"),
                subtitle: `${nextBooking.salonName} · ${when.date} · ${when.time}`,
                to: "/bookings",
                search: { focus: nextBooking.id },
                chevronClassName: "text-background/80",
              },
            ]}
          />
        ) : (
          <ProfileGoMenuGroup
            dark
            items={[
              {
                icon: Sparkles,
                title: t("profile.loyalty"),
                subtitle: t("profile.loyaltyHint", {
                  points: loyaltyMock.points,
                  tier: loyaltyMock.tier,
                }),
                to: "/loyalty",
                chevronClassName: "text-background/80",
              },
            ]}
          />
        )}

        <ProfileGoMenuGroup
          items={[
            { icon: Users, title: t("family.title"), to: "/family" },
            { icon: Shield, title: t("profile.privacy"), to: "/privacy" },
            { icon: Bell, title: t("notifications.title"), to: "/notifications", badge: "2" },
          ]}
        />

        <ProfileGoMenuGroup
          items={[{ icon: Info, title: t("profile.info"), to: "/support" }]}
        />
      </div>
    </div>
  );
}
