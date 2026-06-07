import { apiJson, apiList } from "./client";
import type { Paginated } from "./list-utils";

export type ApiWalletCard = {
  cardholder_name: string;
  card_display: string;
  issued_at: string;
};

export type ApiWalletMe = {
  wallet_number: string;
  balance: string | number;
  card: ApiWalletCard;
  created_at: string;
};

export type ApiLedgerEntry = {
  id: string;
  entry_type: string;
  kind: "in" | "out";
  amount: string | number;
  balance_after: string | number;
  reference_type: string;
  reference_id: string;
  entry_hash: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ApiWalletRecipient = {
  user_id: number;
  full_name: string;
  phone: string | null;
  wallet_number: string;
};

export type ApiGiftSendResponse = {
  balance: string | number;
  gift: {
    id: string;
    amount: string | number;
    message: string;
    status: string;
    recipient_name: string;
    recipient_wallet_number: string;
    created_at: string;
  };
};

export type ApiTopUpResponse = {
  balance: string | number;
  entry: ApiLedgerEntry;
};

export async function fetchWalletMe(): Promise<ApiWalletMe> {
  return apiJson<ApiWalletMe>("/api/v1/wallet/me/");
}

export async function fetchWalletTransactions(params?: {
  direction?: "all" | "in" | "out";
  page?: number;
  page_size?: number;
}): Promise<Paginated<ApiLedgerEntry>> {
  const q = new URLSearchParams();
  if (params?.direction && params.direction !== "all") {
    q.set("direction", params.direction);
  }
  if (params?.page) q.set("page", String(params.page));
  if (params?.page_size) q.set("page_size", String(params.page_size));
  const qs = q.toString();
  const path = qs ? `/api/v1/wallet/transactions/?${qs}` : "/api/v1/wallet/transactions/";
  return apiJson<Paginated<ApiLedgerEntry>>(path);
}

export async function fetchWalletTransactionsList(params?: {
  direction?: "all" | "in" | "out";
  page?: number;
  page_size?: number;
}): Promise<ApiLedgerEntry[]> {
  const q = new URLSearchParams();
  if (params?.direction && params.direction !== "all") {
    q.set("direction", params.direction);
  }
  if (params?.page) q.set("page", String(params.page));
  if (params?.page_size) q.set("page_size", String(params.page_size));
  const qs = q.toString();
  const path = qs ? `/api/v1/wallet/transactions/?${qs}` : "/api/v1/wallet/transactions/";
  return apiList<ApiLedgerEntry>(path);
}

function idempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function topUpWallet(amount: number): Promise<ApiTopUpResponse> {
  return apiJson<ApiTopUpResponse>("/api/v1/wallet/top-up/", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey("topup") },
    body: JSON.stringify({ amount }),
  });
}

export async function searchWalletRecipients(q: string): Promise<ApiWalletRecipient[]> {
  const query = encodeURIComponent(q.trim());
  if (query.length < 2) return [];
  return apiJson<ApiWalletRecipient[]>(`/api/v1/wallet/recipients/search/?q=${query}`);
}

export type SendGiftPayload = {
  amount: number;
  message?: string;
  recipient_user_id?: number;
  recipient_phone?: string;
  recipient_wallet_number?: string;
};

export async function sendGift(payload: SendGiftPayload): Promise<ApiGiftSendResponse> {
  return apiJson<ApiGiftSendResponse>("/api/v1/wallet/gift/send/", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey("gift") },
    body: JSON.stringify(payload),
  });
}

export function parseWalletBalance(value: string | number): number {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}
