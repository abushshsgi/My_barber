import * as Crypto from "expo-crypto";
import { apiJson, apiList, qs } from "./client";

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

export type ApiGiftDesign = {
  id: string;
  name: string;
  name_uz: string;
  fee: string | number;
  preview: {
    from: string;
    to: string;
    accent: string;
    pattern: string;
  };
};

export type ApiGiftSendResponse = {
  balance: string | number;
  gift: {
    id: string;
    amount: string | number;
    gift_amount: string | number;
    design_id: string;
    design_fee: string | number;
    total_charged: string | number;
    message: string;
    status: string;
    sender_name?: string;
    recipient_name: string;
    recipient_wallet_number: string;
    created_at: string;
  };
};

export type ApiReceivedGift = {
  id: string;
  amount: string | number;
  gift_amount: string | number;
  design_id: string;
  design: {
    id: string;
    name: string;
    name_uz: string;
    preview: {
      from: string;
      to: string;
      accent: string;
      pattern: string;
    };
  } | null;
  design_fee: string | number;
  total_charged: string | number;
  message: string;
  status: string;
  sender_name: string;
  sender_wallet_number: string;
  recipient_name: string;
  recipient_wallet_number: string;
  created_at: string;
};

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
  receipt_url?: string | null;
  claimed_at: string | null;
  reviewed_at: string | null;
  review_note: string;
  expires_at: string;
  created_at: string;
  ledger_entry_id: string | null;
  resumed?: boolean;
};

export type ReceivingCardInfo = {
  configured: boolean;
  card_number: string;
  card_masked: string;
  cardholder: string;
  bank: string;
  merchant_ref: string;
};

export type QrResolveResult = {
  public_code: string;
  payload: string;
  barber: { id: number; full_name: string; phone: string };
  request: { id: string; amount: string; note: string; expires_at: string | null } | null;
  min_amount: string;
  max_amount: string;
  account_masked?: string;
};

export type QrPayResult = {
  id: string;
  amount: string;
  barber_name: string;
  status: string;
};

export type SendGiftPayload = {
  design_id: string;
  gift_amount: number;
  message?: string;
  recipient_user_id?: number;
  recipient_phone?: string;
  recipient_wallet_number?: string;
};

/** Server haqiqati bilan mos limitlar (client faqat UX — yakuniy tekshiruv backendda). */
export const MIN_TOPUP_AMOUNT = 10_000;
export const MAX_TOPUP_AMOUNT = 5_000_000;
export const MIN_GIFT_AMOUNT = 5_000;
export const MAX_GIFT_AMOUNT = 1_000_000;
export const MIN_QR_AMOUNT = 1_000;
export const MAX_QR_AMOUNT = 5_000_000;

export async function idempotencyKey(prefix: string): Promise<string> {
  const uuid = await Crypto.randomUUID();
  return `${prefix}-${uuid}`.slice(0, 128);
}

export function parseWalletBalance(value: string | number | undefined | null): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

export async function fetchWalletMe(): Promise<ApiWalletMe> {
  return apiJson<ApiWalletMe>("/api/v1/wallet/me/");
}

/** Hamyon ochish / ensure — backend `WalletService.ensure_wallet`. */
export async function openWallet(): Promise<ApiWalletMe> {
  return fetchWalletMe();
}

export async function fetchWalletTransactions(params?: {
  direction?: "all" | "in" | "out";
  page?: number;
  page_size?: number;
}): Promise<ApiLedgerEntry[]> {
  return apiList<ApiLedgerEntry>(
    `/api/v1/wallet/transactions/${qs({
      direction: params?.direction && params.direction !== "all" ? params.direction : undefined,
      page: params?.page,
      page_size: params?.page_size ?? 50,
    })}`,
  );
}

export async function searchWalletRecipients(q: string): Promise<ApiWalletRecipient[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  return apiJson<ApiWalletRecipient[]>(
    `/api/v1/wallet/recipients/search/${qs({ q: query })}`,
  );
}

export async function fetchGiftDesigns(): Promise<ApiGiftDesign[]> {
  return apiJson<ApiGiftDesign[]>("/api/v1/wallet/gift/designs/");
}

export async function sendGift(payload: SendGiftPayload): Promise<ApiGiftSendResponse> {
  const amount = Math.round(payload.gift_amount);
  if (amount < MIN_GIFT_AMOUNT || amount > MAX_GIFT_AMOUNT) {
    throw new Error(`Sovg'a ${MIN_GIFT_AMOUNT.toLocaleString("uz-UZ")}–${MAX_GIFT_AMOUNT.toLocaleString("uz-UZ")} so'm oralig'ida bo'lishi kerak.`);
  }
  if (!payload.design_id?.trim()) {
    throw new Error("Dizayn tanlang.");
  }
  if (
    payload.recipient_user_id == null &&
    !payload.recipient_phone?.trim() &&
    !payload.recipient_wallet_number?.trim()
  ) {
    throw new Error("Qabul qiluvchini tanlang.");
  }
  const key = await idempotencyKey("gift");
  return apiJson<ApiGiftSendResponse>("/api/v1/wallet/gift/send/", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify({
      design_id: payload.design_id.trim().toLowerCase(),
      gift_amount: amount,
      message: (payload.message || "").trim().slice(0, 280),
      ...(payload.recipient_user_id != null
        ? { recipient_user_id: payload.recipient_user_id }
        : {}),
      ...(payload.recipient_phone?.trim()
        ? { recipient_phone: payload.recipient_phone.trim() }
        : {}),
      ...(payload.recipient_wallet_number?.trim()
        ? { recipient_wallet_number: payload.recipient_wallet_number.trim() }
        : {}),
    }),
  });
}

export async function fetchReceivedGifts(params?: {
  page?: number;
  page_size?: number;
}): Promise<ApiReceivedGift[]> {
  return apiList<ApiReceivedGift>(
    `/api/v1/wallet/gift/received/${qs({
      page: params?.page,
      page_size: params?.page_size ?? 50,
    })}`,
  );
}

export async function fetchReceivingCard(): Promise<ReceivingCardInfo> {
  return apiJson<ReceivingCardInfo>("/api/v1/wallet/top-up/receiving-card/");
}

export async function initCardDeposit(amount: number): Promise<CardDeposit> {
  const amt = Math.round(amount);
  if (amt < MIN_TOPUP_AMOUNT || amt > MAX_TOPUP_AMOUNT) {
    throw new Error(
      `Summa ${MIN_TOPUP_AMOUNT.toLocaleString("uz-UZ")}–${MAX_TOPUP_AMOUNT.toLocaleString("uz-UZ")} so'm oralig'ida bo'lishi kerak.`,
    );
  }
  const key = await idempotencyKey("card-init");
  return apiJson<CardDeposit>("/api/v1/wallet/top-up/card/init/", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify({ amount: amt }),
  });
}

export async function claimCardDeposit(
  depositId: string,
  receipt: { uri: string; name: string; type: string },
): Promise<CardDeposit> {
  if (!depositId || /[^a-zA-Z0-9-]/.test(depositId)) {
    throw new Error("Noto'g'ri depozit ID.");
  }
  if (!receipt.type.startsWith("image/")) {
    throw new Error("Faqat rasm yuklash mumkin.");
  }
  const fd = new FormData();
  fd.append("receipt", {
    uri: receipt.uri,
    name: receipt.name || "receipt.jpg",
    type: receipt.type || "image/jpeg",
  } as unknown as Blob);
  return apiJson<CardDeposit>(`/api/v1/wallet/top-up/card/${depositId}/claim/`, {
    method: "POST",
    body: fd,
  });
}

export async function fetchMyCardDeposits(): Promise<CardDeposit[]> {
  return apiJson<CardDeposit[]>("/api/v1/wallet/top-up/card/deposits/");
}

export async function resolveQrPay(code: string): Promise<QrResolveResult> {
  const trimmed = code.trim();
  if (trimmed.length < 8 || trimmed.length > 2048) {
    throw new Error("QR kod noto'g'ri.");
  }
  if (!trimmed.includes("mysaloon:qrpay:") && !/^[A-Za-z0-9._~-]+$/.test(trimmed)) {
    throw new Error("Noto'g'ri QR format.");
  }
  return apiJson<QrResolveResult>(
    `/api/v1/wallet/qr-pay/resolve/${qs({ code: trimmed })}`,
  );
}

export async function payQr(payload: {
  payload: string;
  amount?: number;
}): Promise<QrPayResult> {
  if (!payload.payload?.trim()) {
    throw new Error("QR payload yo'q.");
  }
  if (payload.amount != null) {
    const amt = Math.round(payload.amount);
    if (amt < MIN_QR_AMOUNT || amt > MAX_QR_AMOUNT) {
      throw new Error(
        `Summa ${MIN_QR_AMOUNT.toLocaleString("uz-UZ")}–${MAX_QR_AMOUNT.toLocaleString("uz-UZ")} so'm oralig'ida.`,
      );
    }
  }
  const key = await idempotencyKey("qrpay");
  return apiJson<QrPayResult>("/api/v1/wallet/qr-pay/", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify({
      payload: payload.payload.trim(),
      ...(payload.amount != null ? { amount: Math.round(payload.amount) } : {}),
    }),
  });
}
