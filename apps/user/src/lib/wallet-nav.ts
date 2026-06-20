import { Gift, LayoutGrid, Receipt, type LucideIcon } from "lucide-react";

export const WALLET_SECTIONS = ["overview", "transactions", "services"] as const;
export type WalletSection = (typeof WALLET_SECTIONS)[number];

export function parseWalletSection(value: unknown, legacyManage?: boolean): WalletSection {
  if (legacyManage) return "transactions";
  if (typeof value === "string" && WALLET_SECTIONS.includes(value as WalletSection)) {
    return value as WalletSection;
  }
  return "overview";
}

export type WalletNavItem = {
  id: WalletSection;
  icon: LucideIcon;
  labelKey: string;
  defaultLabel: string;
};

export const WALLET_NAV: WalletNavItem[] = [
  { id: "overview", icon: LayoutGrid, labelKey: "walletPage.nav.overview", defaultLabel: "Umumiy ko'rinish" },
  { id: "transactions", icon: Receipt, labelKey: "walletPage.nav.transactions", defaultLabel: "Tranzaksiyalar" },
  { id: "services", icon: Gift, labelKey: "walletPage.nav.services", defaultLabel: "Xizmatlar" },
];

export const WALLET_SECTION_TITLE_KEYS: Record<WalletSection, { titleKey: string; defaultTitle: string }> = {
  overview: { titleKey: "walletPage.nav.overview", defaultTitle: "Umumiy ko'rinish" },
  transactions: { titleKey: "walletPage.nav.transactions", defaultTitle: "Tranzaksiyalar" },
  services: { titleKey: "walletPage.nav.services", defaultTitle: "Xizmatlar" },
};
