import {
  Award,
  Bell,
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
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { ProfileMenuItem } from "@/components/profile/ProfileMenuSection";

/** Variant 5 — profilda to'g'ridan-to'g'ri ochiladigan guruhlar (hub sahifa yo'q). */
export const PROFILE_MENU_SECTIONS: {
  titleKey: string;
  labelKeys: string[];
  items: Omit<ProfileMenuItem, "label">[];
}[] = [
  {
    titleKey: "settings.sections.activity",
    labelKeys: ["reviews.title", "favorites.title", "favoriteStylists.title", "profile.giftcard"],
    items: [
      { icon: Star, to: "/reviews" },
      { icon: Heart, to: "/favorites" },
      { icon: Award, to: "/favorite-stylists" },
      { icon: Gift, to: "/wallet", search: { section: "gift" } },
    ],
  },
  {
    titleKey: "settings.sections.payments",
    labelKeys: [
      "profile.wallet",
      "profile.loyalty",
      "paymentMethods.title",
      "profile.offers",
      "subscriptions.title",
    ],
    items: [
      { icon: Wallet, to: "/wallet" },
      { icon: Sparkles, to: "/wallet", search: { section: "loyalty" } },
      { icon: CreditCard, to: "/payment-methods" },
      { icon: Tag, to: "/offers" },
      { icon: Repeat, to: "/subscriptions" },
    ],
  },
  {
    titleKey: "settings.sections.household",
    labelKeys: ["family.title", "referral.title", "addresses.title"],
    items: [
      { icon: Users, to: "/family" },
      { icon: UserPlus, to: "/referrals" },
      { icon: MapPin, to: "/addresses" },
    ],
  },
  {
    titleKey: "profile.sections.app",
    labelKeys: ["notifications.title", "profile.settings", "profile.support", "profile.privacy"],
    items: [
      { icon: Bell, to: "/notifications" },
      { icon: Settings, to: "/settings" },
      { icon: HelpCircle, to: "/support" },
      { icon: Shield, to: "/privacy" },
    ],
  },
];
