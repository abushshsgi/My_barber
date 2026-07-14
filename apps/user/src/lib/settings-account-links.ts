import {
  HelpCircle,
  MapPin,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import type { ProfileMenuItem } from "@/components/profile/ProfileMenuSection";

/** Sozlamalar sahifasidagi ichki havolalar — dropdownda alohida ko'rinmaydi. */
export const SETTINGS_ACCOUNT_LINKS: Omit<ProfileMenuItem, "label">[] = [
  { icon: MapPin, to: "/addresses" },
  { icon: Users, to: "/family" },
  { icon: UserPlus, to: "/referrals" },
  { icon: Shield, to: "/privacy" },
  { icon: HelpCircle, to: "/support" },
];

export const SETTINGS_ACCOUNT_LABEL_KEYS = [
  "profile.addresses",
  "family.title",
  "referral.title",
  "profile.privacy",
  "profile.desktop.helpCenter",
] as const;
