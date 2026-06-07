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
import { mapLedgerEntries } from "@/lib/mappers/wallet";

export const walletMeQueryKey = ["wallet", "me"] as const;
export const walletTxQueryKey = (direction: string) => ["wallet", "transactions", direction] as const;

export function useWalletMe() {
  return useQuery({
    queryKey: walletMeQueryKey,
    queryFn: fetchWalletMe,
    enabled: authQueryEnabled(),
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
  return useQuery({
    queryKey: walletTxQueryKey(direction),
    queryFn: async () => {
      const rows = await fetchWalletTransactionsList({ direction, page_size: pageSize });
      return mapLedgerEntries(rows);
    },
    enabled: authQueryEnabled(),
    staleTime: 10_000,
  });
}

export function useWalletRecipientSearch(q: string) {
  return useQuery({
    queryKey: ["wallet", "recipients", q],
    queryFn: () => searchWalletRecipients(q),
    enabled: authQueryEnabled(q.trim().length >= 2),
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
