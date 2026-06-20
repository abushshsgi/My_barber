import {
  Award,
  Bell,
  CalendarCheck,
  CreditCard,
  Gift,
  Heart,
  HelpCircle,
  MapPin,
  Repeat,
  Settings,
  Shield,
  Sparkles,
  Star,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ProfileMenuItem } from "@/components/profile/ProfileMenuSection";

export type AccountHubKey = "activity" | "payments" | "household" | "preferences";

export type AccountHubMeta = {
  key: AccountHubKey;
  to: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  pageTitleKey: string;
  items: ProfileMenuItem[];
};

export const ACCOUNT_HUBS: AccountHubMeta[] = [
  {
    key: "activity",
    to: "/account/activity",
    icon: CalendarCheck,
    titleKey: "account.hubs.activity.title",
    descKey: "account.hubs.activity.desc",
    pageTitleKey: "account.hubs.activity.pageTitle",
    items: [
      { icon: Star, label: "", to: "/reviews" },
      { icon: Heart, label: "", to: "/favorites" },
      { icon: Award, label: "", to: "/favorite-stylists" },
      { icon: Gift, label: "", to: "/giftcard" },
    ],
  },
  {
    key: "payments",
    to: "/account/payments",
    icon: Wallet,
    titleKey: "account.hubs.payments.title",
    descKey: "account.hubs.payments.desc",
    pageTitleKey: "account.hubs.payments.pageTitle",
    items: [
      { icon: Wallet, label: "", to: "/wallet" },
      { icon: Sparkles, label: "", to: "/loyalty" },
      { icon: CreditCard, label: "", to: "/payment-methods" },
      { icon: Tag, label: "", to: "/offers" },
      { icon: Repeat, label: "", to: "/subscriptions" },
    ],
  },
  {
    key: "household",
    to: "/account/household",
    icon: Users,
    titleKey: "account.hubs.household.title",
    descKey: "account.hubs.household.desc",
    pageTitleKey: "account.hubs.household.pageTitle",
    items: [
      { icon: Users, label: "", to: "/family" },
      { icon: MapPin, label: "", to: "/addresses" },
    ],
  },
  {
    key: "preferences",
    to: "/account/preferences",
    icon: Settings,
    titleKey: "account.hubs.preferences.title",
    descKey: "account.hubs.preferences.desc",
    pageTitleKey: "account.hubs.preferences.pageTitle",
    items: [
      { icon: Bell, label: "", to: "/notifications" },
      { icon: Settings, label: "", to: "/settings" },
      { icon: HelpCircle, label: "", to: "/support" },
      { icon: Shield, label: "", to: "/privacy" },
    ],
  },
];

/** i18n label keys for hub menu items (order matches items[] above). */
export const ACCOUNT_HUB_LABEL_KEYS: Record<AccountHubKey, string[]> = {
  activity: ["reviews.title", "favorites.title", "favoriteStylists.title", "profile.giftcard"],
  payments: [
    "profile.wallet",
    "profile.loyalty",
    "paymentMethods.title",
    "profile.offers",
    "subscriptions.title",
  ],
  household: ["family.title", "addresses.title"],
  preferences: [
    "notifications.title",
    "profile.settings",
    "profile.support",
    "profile.privacy",
  ],
};

export function getHubByKey(key: AccountHubKey): AccountHubMeta {
  const hub = ACCOUNT_HUBS.find((h) => h.key === key);
  if (!hub) throw new Error(`Unknown hub: ${key}`);
  return hub;
}

export function resolveHubItems(
  hub: AccountHubMeta,
  t: (key: string) => string,
): ProfileMenuItem[] {
  const labelKeys = ACCOUNT_HUB_LABEL_KEYS[hub.key];
  return hub.items.map((item, i) => ({
    ...item,
    label: t(labelKeys[i] ?? item.label),
  }));
}
