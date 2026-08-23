import type { ApiLedgerEntry } from "../api/wallet";
import { parseWalletBalance } from "../api/wallet";

export type WalletTx = {
  id: string;
  kind: "in" | "out";
  title: string;
  subtitle?: string;
  date: string;
  amount: number;
  entryType: string;
  createdAt: string;
  senderName?: string;
  recipientName?: string;
  senderWalletMasked?: string;
  recipientWalletMasked?: string;
  message?: string;
};

const ENTRY_TITLES: Record<string, string> = {
  topup: "Hamyon to'ldirish",
  gift_out: "Sovg'a yuborildi",
  gift_in: "Sovg'a qabul qilindi",
  gift_design_fee: "Sovg'a karta dizayni",
  booking_pay: "Bron to'lovi",
  refund: "Qaytarim",
  adjustment: "Tuzatish",
  subscription: "Obuna",
  qr_pay: "QR to'lov",
};

export function formatSomAmount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("uz-UZ");
}

export function formatSomLabel(n: number): string {
  return `${formatSomAmount(n)} so'm`;
}

export function formatTxDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Bugun, ${time}`;
  return d.toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function metaStr(meta: Record<string, unknown>, key: string): string | undefined {
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export function mapLedgerEntry(entry: ApiLedgerEntry): WalletTx {
  const amount = parseWalletBalance(entry.amount);
  const meta = entry.metadata || {};
  let title = ENTRY_TITLES[entry.entry_type] || entry.entry_type;
  let subtitle: string | undefined;

  if (entry.entry_type === "gift_out") {
    const toName = metaStr(meta, "recipient_name");
    title = toName ? `Sovg'a · ${toName}` : "Sovg'a yuborildi";
    const msg = metaStr(meta, "message");
    if (msg) subtitle = msg.slice(0, 60);
  } else if (entry.entry_type === "gift_in") {
    const fromName = metaStr(meta, "sender_name");
    title = fromName ? `Sovg'a · ${fromName}` : "Sovg'a qabul qilindi";
    const msg = metaStr(meta, "message");
    if (msg) subtitle = msg.slice(0, 60);
  } else if (entry.entry_type === "gift_design_fee" && entry.kind === "out") {
    const designId = metaStr(meta, "design_id");
    title = designId ? `Dizayn · ${designId}` : "Sovg'a karta dizayni";
  } else if (entry.entry_type === "qr_pay") {
    const barberName = metaStr(meta, "barber_name");
    title = barberName ? `QR to'lov · ${barberName}` : "QR to'lov";
  } else if (entry.entry_type === "topup") {
    const source = metaStr(meta, "source") || "";
    if (source === "card_manual") title = "Karta to'ldirish";
  } else if (entry.entry_type === "subscription") {
    title = "Obuna";
  }

  const message = metaStr(meta, "message")?.slice(0, 120);

  return {
    id: entry.id,
    kind: entry.kind,
    title,
    subtitle,
    date: formatTxDate(entry.created_at),
    amount,
    entryType: entry.entry_type,
    createdAt: entry.created_at,
    senderName: metaStr(meta, "sender_name"),
    recipientName: metaStr(meta, "recipient_name"),
    senderWalletMasked: metaStr(meta, "sender_wallet_masked"),
    recipientWalletMasked: metaStr(meta, "recipient_wallet_masked"),
    message,
  };
}

/** oklch(...) preview ranglarini RN uchun oddiy hex ga yaqinlashtirish. */
export function designPreviewColors(preview?: {
  from?: string;
  to?: string;
  accent?: string;
} | null): { from: string; to: string; accent: string } {
  const from = preview?.from ?? "";
  if (from.startsWith("#")) {
    return {
      from,
      to: preview?.to?.startsWith("#") ? preview.to : from,
      accent: preview?.accent?.startsWith("#") ? preview.accent : "#FFFFFF",
    };
  }
  return {
    from: "#1A1A1A",
    to: "#2A2A2A",
    accent: "#F5F5F0",
  };
}

export function designColorsById(id: string): { from: string; to: string; accent: string } {
  const colors: Record<string, { from: string; to: string; accent: string }> = {
    classic: { from: "#1A1A1A", to: "#2E2E2E", accent: "#F7F5F0" },
    soft: { from: "#EDE4D4", to: "#D4C4A8", accent: "#1A1A1A" },
    midnight: { from: "#243056", to: "#141828", accent: "#F0EDE4" },
    bloom: { from: "#A84858", to: "#6B2848", accent: "#FFF8F0" },
    forest: { from: "#3D5C45", to: "#1E3328", accent: "#F2F0E4" },
    prestige: { from: "#3A3428", to: "#1E1A14", accent: "#D4C48A" },
    royal: { from: "#5A3870", to: "#281838", accent: "#E8D89A" },
    legend: { from: "#141414", to: "#0A0806", accent: "#E0C878" },
  };
  return colors[id] ?? colors.classic!;
}
