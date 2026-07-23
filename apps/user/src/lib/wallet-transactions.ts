export type WalletTxKind = "in" | "out";

export interface WalletTransaction {
  id: string;
  kind: WalletTxKind;
  title: string;
  date: string;
  group: string;
  amount: number;
  /** API fields for receipt / chek */
  entryType?: string;
  referenceType?: string;
  referenceId?: string;
  balanceAfter?: number;
  entryHash?: string;
  createdAt?: string;
  adminAction?: boolean;
  adminReason?: string;
  subtitle?: string;
  /** Gift / transfer parties for receipt */
  senderName?: string;
  recipientName?: string;
  message?: string;
}

export const WALLET_TRANSACTIONS: WalletTransaction[] = [
  { id: "t1", kind: "in", title: "Cashback · Modern Cuts", date: "Bugun, 14:20", group: "Bu oy", amount: 12000 },
  { id: "t2", kind: "out", title: "Bron · Lazzat Spa", date: "Kecha, 18:45", group: "Bu oy", amount: -180000 },
  { id: "t3", kind: "in", title: "Do'stni taklif qildingiz", date: "2 kun oldin", group: "Bu oy", amount: 25000 },
  { id: "t4", kind: "out", title: "Sovg'a karta · Madina", date: "5 kun oldin", group: "Bu oy", amount: -100000 },
  { id: "t5", kind: "in", title: "Promo · Yangi yil", date: "1 hafta oldin", group: "Bu oy", amount: 50000 },
  { id: "t6", kind: "out", title: "Bron · Legacy Barbershop", date: "12 yan", group: "Yanvar", amount: -95000 },
  { id: "t7", kind: "in", title: "Cashback · Atelier Beauty", date: "8 yan", group: "Yanvar", amount: 8500 },
  { id: "t8", kind: "out", title: "Hamyon to'ldirish", date: "3 yan", group: "Yanvar", amount: -200000 },
  { id: "t9", kind: "in", title: "Referral bonus", date: "28 dek", group: "Dekabr", amount: 30000 },
  { id: "t10", kind: "out", title: "Bron · Noir Studio", date: "21 dek", group: "Dekabr", amount: -120000 },
  { id: "t11", kind: "in", title: "Cashback · Glow Spa", date: "15 dek", group: "Dekabr", amount: 14000 },
];

import { formatPrice } from "@/lib/price-display";

export function formatWalletTxAmount(n: number) {
  return formatPrice(Math.abs(n));
}

export type WalletTxTab = "all" | "in" | "out";

export function filterWalletTransactions(transactions: WalletTransaction[], tab: WalletTxTab) {
  if (tab === "all") return transactions;
  return transactions.filter((tx) => tx.kind === tab);
}

export function groupWalletTransactions(transactions: WalletTransaction[]) {
  const groups: { label: string; items: WalletTransaction[] }[] = [];
  const map = new Map<string, WalletTransaction[]>();

  for (const tx of transactions) {
    const list = map.get(tx.group) ?? [];
    list.push(tx);
    map.set(tx.group, list);
  }

  for (const [label, items] of map) {
    groups.push({ label, items });
  }

  return groups;
}
