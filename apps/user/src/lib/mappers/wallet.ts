import type { ApiLedgerEntry } from "@/lib/api/wallet";
import type { WalletTransaction } from "@/lib/wallet-transactions";

const ENTRY_TITLES: Record<string, string> = {
  topup: "Hamyon to'ldirish",
  gift_out: "Sovg'a yuborildi",
  gift_in: "Sovg'a qabul qilindi",
  gift_design_fee: "Sovg'a karta dizayni",
  booking_pay: "Bron to'lovi",
  refund: "Qaytarim",
  adjustment: "Tuzatish",
  subscription: "Obuna",
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

/** User-facing short notice — never dump raw admin free-text (can be gibberish). */
function adminGiftTitle(
  entry: ApiLedgerEntry,
  meta: Record<string, unknown>,
): { title: string; subtitle?: string; adminAction: boolean; adminReason?: string } | null {
  const action = typeof meta.action === "string" ? meta.action : "";
  const ref = (entry.reference_type || "").trim();

  if (action === "gift_hold" || ref === "gift_hold") {
    return {
      title: "Admin · sovg'a hold",
      subtitle: "Mablag' ushlab turildi",
      adminAction: true,
      adminReason: "Ogohlantirish: mablag' vaqtincha ushlab turildi.",
    };
  }
  if (action === "gift_release" || ref === "gift_release") {
    return {
      title: "Admin · hold ochildi",
      subtitle: "Mablag' qaytarildi",
      adminAction: true,
      adminReason: "Mablag' qaytarildi.",
    };
  }
  if (action === "gift_refund" || ref === "gift_refund" || ref === "gift_refund_fee") {
    return {
      title: ref === "gift_refund_fee" ? "Admin · dizayn to'lovi qaytarildi" : "Admin · sovg'a qaytarildi",
      subtitle: "Mablag' qaytarildi",
      adminAction: true,
      adminReason: "Mablag' qaytarildi.",
    };
  }
  return null;
}

export function mapLedgerEntry(entry: ApiLedgerEntry): WalletTransaction {
  const amount = typeof entry.amount === "number" ? entry.amount : parseFloat(String(entry.amount));
  const balanceAfter =
    typeof entry.balance_after === "number"
      ? entry.balance_after
      : parseFloat(String(entry.balance_after ?? 0));
  const meta = entry.metadata || {};
  let title = ENTRY_TITLES[entry.entry_type] || entry.entry_type;
  let subtitle: string | undefined;
  let adminAction = false;
  let adminReason: string | undefined;

  const admin = adminGiftTitle(entry, meta);
  if (admin) {
    title = admin.title;
    subtitle = admin.subtitle;
    adminAction = admin.adminAction;
    adminReason = admin.adminReason;
  } else if (entry.entry_type === "gift_out") {
    const toName = typeof meta.recipient_name === "string" ? meta.recipient_name.trim() : "";
    title = toName ? `Sovg'a · ${toName}` : "Sovg'a yuborildi";
    if (typeof meta.message === "string" && meta.message) {
      subtitle = meta.message.slice(0, 60);
    }
  } else if (entry.entry_type === "gift_in") {
    const fromName = typeof meta.sender_name === "string" ? meta.sender_name.trim() : "";
    title = fromName ? `${fromName}dan sovg'a` : "Sovg'a qabul qilindi";
    if (typeof meta.message === "string" && meta.message) {
      subtitle = meta.message.slice(0, 60);
    }
  } else if (entry.entry_type === "gift_design_fee" && entry.kind === "out") {
    const designId = typeof meta.design_id === "string" ? meta.design_id : "";
    title = designId ? `Dizayn · ${designId}` : "Sovg'a karta dizayni";
  } else if (entry.entry_type === "topup") {
    const source = typeof meta.source === "string" ? meta.source : "";
    const ref = typeof meta.transaction_ref === "string" ? meta.transaction_ref : "";
    if (source === "card_manual") {
      title = ref ? `Karta to'ldirish · ${ref}` : "Karta to'ldirish";
    } else if (source.includes("click")) {
      title = "Click to'ldirish";
    } else if (source.includes("payme")) {
      title = "Payme to'ldirish";
    }
  } else if (entry.entry_type === "adjustment") {
    const action = typeof meta.action === "string" ? meta.action : "";
    if (action === "clawback_fake_provider_topup") {
      title = "Soxta to'lov bekor qilindi";
    }
  }

  return {
    id: entry.id,
    kind: entry.kind,
    title,
    subtitle,
    date: formatTxDate(entry.created_at),
    group: monthGroupLabel(entry.created_at),
    amount,
    entryType: entry.entry_type,
    referenceType: entry.reference_type || "",
    referenceId: entry.reference_id || "",
    balanceAfter: Number.isFinite(balanceAfter) ? balanceAfter : undefined,
    entryHash: entry.entry_hash || "",
    createdAt: entry.created_at,
    adminAction,
    adminReason,
  };
}

export function mapLedgerEntries(entries: ApiLedgerEntry[]): WalletTransaction[] {
  return entries.map(mapLedgerEntry);
}
