import {
  Bell,
  CreditCard,
  Globe,
  HelpCircle,
  Lock,
  MapPin,
  Repeat,
  Shield,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export const SETTINGS_SECTIONS = [
  "personal",
  "security",
  "privacy",
  "notifications",
  "preferences",
  "payments",
  "subscriptions",
  "addresses",
  "family",
  "help",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const SETTINGS_EDIT_FIELDS = ["name", "email", "password", "language", "audience"] as const;
export type SettingsEditField = (typeof SETTINGS_EDIT_FIELDS)[number];

export function parseSettingsSection(value: unknown): SettingsSection {
  if (typeof value === "string" && SETTINGS_SECTIONS.includes(value as SettingsSection)) {
    return value as SettingsSection;
  }
  return "personal";
}

export function parseSettingsEdit(value: unknown): SettingsEditField | undefined {
  if (typeof value === "string" && SETTINGS_EDIT_FIELDS.includes(value as SettingsEditField)) {
    return value as SettingsEditField;
  }
  return undefined;
}

export type SettingsNavItem = {
  id: SettingsSection;
  icon: LucideIcon;
  labelKey: string;
  defaultLabel: string;
  /** External route — sidebar navigates away from /settings */
  externalTo?: string;
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  { id: "personal", icon: User, labelKey: "settings.hubs.personal.title", defaultLabel: "Shaxsiy ma'lumotlar" },
  { id: "security", icon: Lock, labelKey: "settings.hubs.security.title", defaultLabel: "Kirish va xavfsizlik" },
  { id: "privacy", icon: Shield, labelKey: "settings.hubs.privacy.title", defaultLabel: "Maxfiylik" },
  { id: "notifications", icon: Bell, labelKey: "settings.hubs.notifications.title", defaultLabel: "Bildirishnomalar" },
  { id: "preferences", icon: Globe, labelKey: "settings.hubs.preferences.title", defaultLabel: "Til va afzalliklar" },
  { id: "payments", icon: CreditCard, labelKey: "settings.hubs.payments.title", defaultLabel: "To'lov usullari" },
  { id: "subscriptions", icon: Repeat, labelKey: "settings.hubs.subscriptions.title", defaultLabel: "Obunalar" },
  { id: "addresses", icon: MapPin, labelKey: "settings.hubs.addresses.title", defaultLabel: "Manzillar" },
  { id: "family", icon: Users, labelKey: "settings.hubs.family.title", defaultLabel: "Oilaviy profil" },
  { id: "help", icon: HelpCircle, labelKey: "settings.hubs.help.title", defaultLabel: "Yordam markazi" },
];

export const SETTINGS_SECTION_TITLE_KEYS: Record<SettingsSection, { titleKey: string; defaultTitle: string }> = {
  personal: { titleKey: "settings.hubs.personal.title", defaultTitle: "Shaxsiy ma'lumotlar" },
  security: { titleKey: "settings.hubs.security.title", defaultTitle: "Kirish va xavfsizlik" },
  privacy: { titleKey: "settings.hubs.privacy.title", defaultTitle: "Maxfiylik" },
  notifications: { titleKey: "settings.hubs.notifications.title", defaultTitle: "Bildirishnomalar" },
  preferences: { titleKey: "settings.hubs.preferences.title", defaultTitle: "Til va afzalliklar" },
  payments: { titleKey: "settings.hubs.payments.title", defaultTitle: "To'lov usullari" },
  subscriptions: { titleKey: "settings.hubs.subscriptions.title", defaultTitle: "Obunalar" },
  addresses: { titleKey: "settings.hubs.addresses.title", defaultTitle: "Manzillar" },
  family: { titleKey: "settings.hubs.family.title", defaultTitle: "Oilaviy profil" },
  help: { titleKey: "settings.hubs.help.title", defaultTitle: "Yordam markazi" },
};
