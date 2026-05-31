import {
  Award,
  CreditCard,
  Gift,
  Heart,
  MapPin,
  MessageSquare,
  Repeat,
  Sparkles,
  Star,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import type { ProfileMenuItem } from "@/components/profile/ProfileMenuSection";

export const SETTINGS_ACCOUNT_SECTIONS: {
  titleKey: string;
  labelKeys: string[];
  items: Omit<ProfileMenuItem, "label">[];
}[] = [
  {
    titleKey: "settings.sections.activity",
    labelKeys: ["reviews.title", "favorites.title", "favoriteStylists.title"],
    items: [
      { icon: Star, to: "/reviews" },
      { icon: Heart, to: "/favorites" },
      { icon: Award, to: "/favorite-stylists" },
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
      "profile.giftcard",
    ],
    items: [
      { icon: Wallet, to: "/wallet" },
      { icon: Sparkles, to: "/loyalty" },
      { icon: CreditCard, to: "/payment-methods" },
      { icon: Tag, to: "/offers" },
      { icon: Repeat, to: "/subscriptions" },
      { icon: Gift, to: "/giftcard" },
    ],
  },
  {
    titleKey: "settings.sections.household",
    labelKeys: ["family.title", "addresses.title"],
    items: [
      { icon: Users, to: "/family" },
      { icon: MapPin, to: "/addresses" },
    ],
  },
  {
    titleKey: "settings.sections.chat",
    labelKeys: ["chat.title"],
    items: [{ icon: MessageSquare, to: "/chat" }],
  },
];
