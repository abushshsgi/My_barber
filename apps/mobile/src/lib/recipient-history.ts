import AsyncStorage from "@react-native-async-storage/async-storage";

export type RecipientHistoryItem = {
  userId: number;
  fullName: string;
  /** Bank uslubi: ****1234 yoki •••• 1234 */
  walletMasked: string;
  lastSearchedAt: number;
  lastSentAt?: number;
  sendCount: number;
};

const MAX_ITEMS = 30;

function key(userId: number | string) {
  return `wallet_recipient_history_v1:${userId}`;
}

function rank(a: RecipientHistoryItem, b: RecipientHistoryItem): number {
  const aSent = a.lastSentAt ?? 0;
  const bSent = b.lastSentAt ?? 0;
  if (aSent !== bSent) return bSent - aSent;
  if (a.sendCount !== b.sendCount) return b.sendCount - a.sendCount;
  return b.lastSearchedAt - a.lastSearchedAt;
}

export function maskWalletDisplay(raw?: string | null): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length >= 4) return `•••• ${digits.slice(-4)}`;
  if ((raw || "").includes("*") || (raw || "").includes("•")) {
    const tail = (raw || "").replace(/\D/g, "").slice(-4);
    return tail ? `•••• ${tail}` : "••••";
  }
  return "••••";
}

export async function loadRecipientHistory(
  userId: number | string,
): Promise<RecipientHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecipientHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort(rank).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

async function saveAll(userId: number | string, items: RecipientHistoryItem[]) {
  await AsyncStorage.setItem(key(userId), JSON.stringify(items.slice(0, MAX_ITEMS)));
}

/** Qidiruvdan tanlanganda — tarixga yozadi. */
export async function rememberRecipientSearch(
  ownerUserId: number | string,
  item: { userId: number; fullName: string; walletMasked?: string | null },
): Promise<RecipientHistoryItem[]> {
  const now = Date.now();
  const prev = await loadRecipientHistory(ownerUserId);
  const existing = prev.find((x) => x.userId === item.userId);
  const next: RecipientHistoryItem = {
    userId: item.userId,
    fullName: item.fullName || existing?.fullName || "Foydalanuvchi",
    walletMasked: maskWalletDisplay(item.walletMasked || existing?.walletMasked),
    lastSearchedAt: now,
    lastSentAt: existing?.lastSentAt,
    sendCount: existing?.sendCount ?? 0,
  };
  const merged = [next, ...prev.filter((x) => x.userId !== item.userId)].sort(rank);
  await saveAll(ownerUserId, merged);
  return merged;
}

/** Pul yuborilganda — eng yuqoriga chiqadi. */
export async function rememberRecipientSent(
  ownerUserId: number | string,
  item: { userId: number; fullName: string; walletMasked?: string | null },
): Promise<RecipientHistoryItem[]> {
  const now = Date.now();
  const prev = await loadRecipientHistory(ownerUserId);
  const existing = prev.find((x) => x.userId === item.userId);
  const next: RecipientHistoryItem = {
    userId: item.userId,
    fullName: item.fullName || existing?.fullName || "Foydalanuvchi",
    walletMasked: maskWalletDisplay(item.walletMasked || existing?.walletMasked),
    lastSearchedAt: now,
    lastSentAt: now,
    sendCount: (existing?.sendCount ?? 0) + 1,
  };
  const merged = [next, ...prev.filter((x) => x.userId !== item.userId)].sort(rank);
  await saveAll(ownerUserId, merged);
  return merged;
}
