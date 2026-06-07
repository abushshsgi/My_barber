import type { ApiLedgerEntry } from "@/lib/api/wallet";
import type { WalletTransaction } from "@/lib/wallet-transactions";

const ENTRY_TITLES: Record<string, string> = {
  topup: "Hamyon to'ldirish",
  gift_out: "Sovg'a yuborildi",
  gift_in: "Sovg'a qabul qilindi",
  booking_pay: "Bron to'lovi",
  refund: "Qaytarim",
  adjustment: "Tuzatish",
};

function formatTxDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Bugun, ${time}`;
  return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function monthGroupLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Boshqa";
  const now = new Date();
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
    return "Bu oy";
  }
  return d.toLocaleDateString("uz-UZ", { month: "long" });
}

export function mapLedgerEntry(entry: ApiLedgerEntry): WalletTransaction {
  const amount = typeof entry.amount === "number" ? entry.amount : parseFloat(String(entry.amount));
  const meta = entry.metadata || {};
  let title = ENTRY_TITLES[entry.entry_type] || entry.entry_type;
  if (entry.entry_type === "gift_out" && typeof meta.message === "string" && meta.message) {
    title = `Sovg'a · ${meta.message.slice(0, 40)}`;
  }
  if (entry.entry_type === "gift_in") {
    title = "Sovg'a qabul qilindi";
  }

  return {
    id: entry.id,
    kind: entry.kind,
    title,
    date: formatTxDate(entry.created_at),
    group: monthGroupLabel(entry.created_at),
    amount,
  };
}

export function mapLedgerEntries(entries: ApiLedgerEntry[]): WalletTransaction[] {
  return entries.map(mapLedgerEntry);
}
