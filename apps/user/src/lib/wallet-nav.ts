import {
  CreditCard,
  Gift,
  LayoutGrid,
  Receipt,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const WALLET_SECTIONS = [
  "overview",
  "transactions",
  "payments",
  "gift",
  "loyalty",
] as const;
export type WalletSection = (typeof WALLET_SECTIONS)[number];

const LEGACY_SECTIONS: Record<string, WalletSection> = {
  services: "gift",
};

export function parseWalletSection(value: unknown, legacyManage?: boolean): WalletSection {
  if (legacyManage) return "transactions";
  if (typeof value === "string") {
    if (WALLET_SECTIONS.includes(value as WalletSection)) {
      return value as WalletSection;
    }
    if (value in LEGACY_SECTIONS) {
      return LEGACY_SECTIONS[value];
    }
  }
  return "overview";
}

export type WalletSearch = {
  section?: string;
  plan?: string;
  promo?: string;
  returnTo?: string;
  backTo?: string;
  manage?: boolean;
};

function optString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** Faqat aniq true. `manage=false` qidiruvi validatsiyani sindirmasligi va URL da qolmasligi kerak. */
export function parseWalletManageFlag(value: unknown): true | undefined {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  return undefined;
}

/** validateSearch hech qachon throw qilmasin — noto'g'ri query bo'sh sahifa/spinner qilmasin. */
export function parseWalletSearch(search: Record<string, unknown>): WalletSearch {
  return {
    section: optString(search.section),
    plan: optString(search.plan),
    promo: optString(search.promo),
    returnTo: optString(search.returnTo),
    backTo: optString(search.backTo),
    manage: parseWalletManageFlag(search.manage),
  };
}

export type WalletNavItem = {
  id: WalletSection;
  icon: LucideIcon;
  labelKey: string;
  defaultLabel: string;
};

export const WALLET_NAV: WalletNavItem[] = [
  {
    id: "overview",
    icon: LayoutGrid,
    labelKey: "walletPage.nav.overview",
    defaultLabel: "Umumiy ko'rinish",
  },
  {
    id: "transactions",
    icon: Receipt,
    labelKey: "walletPage.nav.transactions",
    defaultLabel: "Tranzaksiyalar",
  },
  {
    id: "payments",
    icon: CreditCard,
    labelKey: "paymentMethods.title",
    defaultLabel: "To'lov usullari",
  },
  { id: "gift", icon: Gift, labelKey: "walletPage.nav.gift", defaultLabel: "Sovg'a karta" },
  {
    id: "loyalty",
    icon: Sparkles,
    labelKey: "walletPage.nav.loyalty",
    defaultLabel: "Bonus dasturi",
  },
];

export const WALLET_HUB_SECTIONS = ["payments", "loyalty", "gift"] as const;
export type WalletHubSection = (typeof WALLET_HUB_SECTIONS)[number];

export const WALLET_HUB_LINKS: {
  section: WalletHubSection;
  icon: LucideIcon;
  labelKey: string;
  defaultLabel: string;
}[] = [
  {
    section: "payments",
    icon: CreditCard,
    labelKey: "paymentMethods.title",
    defaultLabel: "To'lov usullari",
  },
  {
    section: "loyalty",
    icon: Sparkles,
    labelKey: "profile.loyalty",
    defaultLabel: "Bonus dasturi",
  },
  { section: "gift", icon: Gift, labelKey: "profile.giftcard", defaultLabel: "Sovg'a karta" },
];

export const WALLET_SECTION_TITLE_KEYS: Record<
  WalletSection,
  { titleKey: string; defaultTitle: string }
> = {
  overview: { titleKey: "walletPage.nav.overview", defaultTitle: "Umumiy ko'rinish" },
  transactions: { titleKey: "walletPage.nav.transactions", defaultTitle: "Tranzaksiyalar" },
  payments: { titleKey: "paymentMethods.title", defaultTitle: "To'lov usullari" },
  gift: { titleKey: "walletPage.nav.gift", defaultTitle: "Sovg'a karta" },
  loyalty: { titleKey: "walletPage.nav.loyalty", defaultTitle: "Bonus dasturi" },
};
