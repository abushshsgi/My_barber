import {
  Award,
  Bell,
  Briefcase,
  CreditCard,
  Gift,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  MessageSquare,
  Repeat,
  Settings,
  Shield,
  Sparkles,
  Tag,
  User,
  Users,
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

/** Booking / Airbnb-style account menu — grouped by dividers, no section titles. */
export const ACCOUNT_NAV_SECTIONS: AccountNavSectionDef[] = [
  {
    items: [
      { to: "/profile", icon: User, labelKey: "profile.desktop.myAccount", defaultLabel: "Mening hisobim" },
      { to: "/bookings", icon: Briefcase, labelKey: "profile.bookings", defaultLabel: "Buyurtmalar" },
      { to: "/loyalty", icon: Sparkles, labelKey: "profile.loyalty", defaultLabel: "Bonus dasturi" },
      { to: "/wallet", icon: Wallet, labelKey: "profile.wallet", defaultLabel: "Hamyon" },
      { to: "/reviews", icon: MessageSquare, labelKey: "reviews.title", defaultLabel: "Sharhlar" },
      { to: "/favorites", icon: Heart, labelKey: "favorites.title", defaultLabel: "Saqlangan" },
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
      { to: "/addresses", icon: MapPin, labelKey: "profile.addresses", defaultLabel: "Manzillar" },
      { to: "/payment-methods", icon: CreditCard, labelKey: "paymentMethods.title", defaultLabel: "To'lov usullari" },
    ],
  },
  {
    items: [
      { to: "/offers", icon: Tag, labelKey: "profile.offers", defaultLabel: "Aksiyalar" },
      { to: "/subscriptions", icon: Repeat, labelKey: "subscriptions.title", defaultLabel: "Obuna" },
      { to: "/giftcard", icon: Gift, labelKey: "profile.giftcard", defaultLabel: "Sovg'a karta" },
      { to: "/family", icon: Users, labelKey: "family.title", defaultLabel: "Oila profili" },
      { to: "/favorite-stylists", icon: Award, labelKey: "favoriteStylists.title", defaultLabel: "Sevimli ustalar" },
    ],
  },
  {
    items: [
      { to: "/support", icon: HelpCircle, labelKey: "profile.desktop.helpCenter", defaultLabel: "Yordam markazi" },
      { to: "/privacy", icon: Shield, labelKey: "profile.privacy", defaultLabel: "Maxfiylik" },
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
  return pathname === to || pathname.startsWith(`${to}/`);
}
