import type { AdminSubscriptionPaymentRow } from "@/lib/admin-api";

export const PAYME_STATUS_LABEL: Record<string, string> = {
  pending: "Kutilmoqda",
  paid: "To'langan",
  failed: "Muvaffaqiyatsiz",
  cancelled: "Bekor",
  expired: "Muddati o'tgan",
  refunded: "Qaytarilgan",
};

export const PAYME_STATE_LABEL: Record<string, string> = {
  "0": "Chek yaratilgan",
  "4": "To'langan",
  "-1": "Bekor qilingan",
  "-2": "Qaytarilgan",
  "1": "Muddati o'tgan",
  "20": "Muddati o'tgan",
  "21": "Muddati o'tgan",
};

export function formatPayWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function cardNetwork(mask: string | null | undefined) {
  const digits = (mask || "").replace(/\D/g, "");
  if (digits.startsWith("9860")) return "Humo";
  if (digits.startsWith("8600")) return "Uzcard";
  if (digits.startsWith("4")) return "Visa";
  if (digits.startsWith("5")) return "Mastercard";
  return "";
}

export function paymeChannel(row: Pick<AdminSubscriptionPaymentRow, "card_mask" | "provider">) {
  const network = cardNetwork(row.card_mask);
  if (network && row.card_mask) return `${network} · ${row.card_mask}`;
  if (row.card_mask) return row.card_mask;
  return "Payme Checkout";
}

export function paymeStateLabel(state: number | null | undefined) {
  if (state == null) return "—";
  return PAYME_STATE_LABEL[String(state)] || `Holat ${state}`;
}
