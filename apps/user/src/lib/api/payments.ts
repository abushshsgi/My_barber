import { apiJson } from "./client";

export type PaymentProvider = {
  id: string;
  label: string;
  configured: boolean;
};

export async function fetchPaymentProviders(): Promise<PaymentProvider[]> {
  const data = await apiJson<{ providers: PaymentProvider[] }>("/api/v1/payments/providers/");
  return data.providers ?? [];
}

export async function startPaymentCheckout(payload: {
  provider: "click" | "payme";
  amount: number;
  order_id?: string;
  return_url?: string;
}): Promise<{
  provider: string;
  configured: boolean;
  checkout_url: string | null;
  transaction_id: string;
  message: string;
}> {
  return apiJson("/api/v1/payments/checkout/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function confirmPaymentCheckout(payload: {
  provider: "click" | "payme";
  order_id: string;
  transaction_id?: string;
}): Promise<{ balance: string | number; already_processed?: boolean }> {
  return apiJson("/api/v1/payments/confirm/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function buildWalletTopUpOrderId(userId: number, amount: number): string {
  return `wallet-topup-${userId}-${amount}-${Date.now()}`;
}

function idempotencyKey(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand}`.slice(0, 128);
}

export type CardDepositReceiving = {
  number: string;
  masked: string;
  cardholder: string;
  bank: string;
};

export type CardDeposit = {
  id: string;
  amount: string | number;
  status: string;
  transaction_ref: string;
  merchant_ref: string;
  receiving_card: CardDepositReceiving;
  claimed_at: string | null;
  reviewed_at: string | null;
  review_note: string;
  expires_at: string;
  created_at: string;
  ledger_entry_id: string | null;
};

export type ReceivingCardInfo = {
  configured: boolean;
  card_number: string;
  card_masked: string;
  cardholder: string;
  bank: string;
  merchant_ref: string;
};

export async function fetchReceivingCard(): Promise<ReceivingCardInfo> {
  return apiJson<ReceivingCardInfo>("/api/v1/wallet/top-up/receiving-card/");
}

export async function initCardDeposit(amount: number): Promise<CardDeposit> {
  return apiJson<CardDeposit>("/api/v1/wallet/top-up/card/init/", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey("card-init") },
    body: JSON.stringify({ amount }),
  });
}

export async function claimCardDeposit(depositId: string): Promise<CardDeposit> {
  return apiJson<CardDeposit>(`/api/v1/wallet/top-up/card/${depositId}/claim/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function fetchMyCardDeposits(): Promise<CardDeposit[]> {
  return apiJson<CardDeposit[]>("/api/v1/wallet/top-up/card/deposits/");
}
