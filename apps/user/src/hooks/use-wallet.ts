import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchWalletMe,
  fetchWalletTransactionsList,
  parseWalletBalance,
  searchWalletRecipients,
  sendGift,
  topUpWallet,
  type ApiWalletMe,
  type SendGiftPayload,
} from "@/lib/api/wallet";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";
import { mapLedgerEntries } from "@/lib/mappers/wallet";

export const walletMeQueryKeyBase = ["wallet", "me"] as const;

export function walletMeQueryKeyFor(userId: number | null) {
  return userQueryKey(walletMeQueryKeyBase, userId);
}

export function walletTxQueryKeyFor(userId: number | null, direction: string) {
  return userQueryKey(["wallet", "transactions", direction] as const, userId);
}

export function useWalletMe() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: walletMeQueryKeyFor(userId),
    queryFn: fetchWalletMe,
    enabled: authQueryEnabled(!!userId),
    staleTime: 15_000,
  });
}

export function useWalletBalance() {
  const { data, ...rest } = useWalletMe();
  return {
    ...rest,
    wallet: data,
    balance: data ? parseWalletBalance(data.balance) : 0,
    walletNumber: data?.wallet_number ?? "",
    card: data?.card,
  };
}

export function useWalletTransactions(direction: "all" | "in" | "out" = "all", pageSize = 50) {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: walletTxQueryKeyFor(userId, direction),
    queryFn: async () => {
      const rows = await fetchWalletTransactionsList({ direction, page_size: pageSize });
      return mapLedgerEntries(rows);
    },
    enabled: authQueryEnabled(!!userId),
    staleTime: 10_000,
  });
}

export function useWalletRecipientSearch(q: string) {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: userQueryKey(["wallet", "recipients", q] as const, userId),
    queryFn: () => searchWalletRecipients(q),
    enabled: authQueryEnabled(!!userId && q.trim().length >= 2),
    staleTime: 30_000,
  });
}

export function useTopUpWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => topUpWallet(amount),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useSendGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendGiftPayload) => sendGift(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export type { ApiWalletMe };
