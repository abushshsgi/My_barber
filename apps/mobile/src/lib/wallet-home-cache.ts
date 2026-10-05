import {
  fetchWalletMe,
  fetchWalletTransactions,
  type ApiWalletMe,
} from "../api/wallet";
import { mapLedgerEntry, type WalletTx } from "./wallet-format";

const wallets = new Map<string, ApiWalletMe>();
const lists = new Map<string, WalletTx[]>();
const inflight = new Map<string, Promise<unknown>>();

function txKey(userId: string, direction: string, entryType: string | undefined, pageSize: number) {
  return `${userId}|${direction}|${entryType || ""}|${pageSize}`;
}

export function peekWallet(userId: string): ApiWalletMe | null {
  return wallets.get(userId) ?? null;
}

export function peekWalletTx(
  userId: string,
  direction: string,
  entryType: string | undefined,
  pageSize: number,
): WalletTx[] | null {
  return lists.get(txKey(userId, direction, entryType, pageSize)) ?? null;
}

export function loadWallet(userId: string): Promise<ApiWalletMe> {
  const key = `w:${userId}`;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<ApiWalletMe>;
  const run = fetchWalletMe()
    .then((wallet) => {
      wallets.set(userId, wallet);
      return wallet;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, run);
  return run;
}

export function loadWalletTx(
  userId: string,
  direction: "all" | "in" | "out",
  entryType: string | undefined,
  pageSize: number,
): Promise<WalletTx[]> {
  const key = `t:${txKey(userId, direction, entryType, pageSize)}`;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<WalletTx[]>;
  const run = fetchWalletTransactions({
    direction,
    entry_type: entryType,
    page_size: pageSize,
  })
    .then((rows) => {
      const mapped = rows.map(mapLedgerEntry);
      lists.set(txKey(userId, direction, entryType, pageSize), mapped);
      return mapped;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, run);
  return run;
}
