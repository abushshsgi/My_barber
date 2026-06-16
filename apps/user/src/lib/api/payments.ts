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
