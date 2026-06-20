import {
  Bell,
  Briefcase,
  Heart,
  LogOut,
  MessageSquare,
  Settings,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type AccountNavItemDef = {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  defaultLabel: string;
  badgeFromNotifications?: boolean;
};

export type AccountNavSectionDef = {
  items: AccountNavItemDef[];
};

/** Minimal Booking-style dropdown — batafsil bo'limlar ichki sahifalarda. */
export const ACCOUNT_NAV_SECTIONS: AccountNavSectionDef[] = [
  {
    items: [
      { to: "/profile", icon: User, labelKey: "profile.desktop.myAccount", defaultLabel: "Mening hisobim" },
      { to: "/bookings", icon: Briefcase, labelKey: "profile.bookings", defaultLabel: "Buyurtmalar" },
      { to: "/wallet", icon: Wallet, labelKey: "profile.wallet", defaultLabel: "Hamyon" },
      { to: "/reviews", icon: MessageSquare, labelKey: "reviews.title", defaultLabel: "Sharhlar" },
      { to: "/favorites", icon: Heart, labelKey: "favorites.hubTitle", defaultLabel: "Sevimlilar" },
    ],
  },
  {
    items: [
      {
        to: "/notifications",
        icon: Bell,
        labelKey: "notifications.title",
        defaultLabel: "Bildirishnomalar",
        badgeFromNotifications: true,
      },
      { to: "/settings", icon: Settings, labelKey: "profile.desktop.accountSettings", defaultLabel: "Hisob sozlamalari" },
    ],
  },
];

export const ACCOUNT_NAV_LOGOUT = {
  icon: LogOut,
  labelKey: "common.logout",
  defaultLabel: "Chiqish",
} as const;

export function isAccountNavActive(pathname: string, to: string) {
  if (to === "/profile") return pathname === "/profile";
  if (to === "/wallet") {
    return (
      pathname === "/wallet" ||
      pathname.startsWith("/wallet/") ||
      pathname === "/payment-methods" ||
      pathname.startsWith("/payment-methods/") ||
      pathname === "/loyalty" ||
      pathname === "/giftcard" ||
      pathname === "/offers" ||
      pathname === "/subscriptions"
    );
  }
  if (to === "/favorites") {
    return pathname === "/favorites" || pathname.startsWith("/favorite-stylists");
  }
  if (to === "/settings") {
    return (
      pathname === "/settings" ||
      pathname === "/addresses" ||
      pathname.startsWith("/addresses/") ||
      pathname === "/family" ||
      pathname === "/privacy" ||
      pathname === "/support"
    );
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}
