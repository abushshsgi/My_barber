import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Copy, Shield } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatWalletTxAmount, type WalletTransaction } from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

type Props = {
  tx: WalletTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 py-3 last:border-b-0">
      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="max-w-[70%] text-right text-[13px] font-semibold leading-snug">{value}</span>
    </div>
  );
}

function CopyIdRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyText(value);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 text-left transition-colors active:bg-surface/80"
      title="Nusxa olish"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">Yozuv ID</p>
        <p className="mt-0.5 break-all font-mono text-[11px] font-semibold tracking-tight text-foreground/90">
          {value}
        </p>
      </div>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl bg-background",
          copied ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </span>
    </button>
  );
}

function isGiftTx(tx: WalletTransaction) {
  return tx.entryType === "gift_in" || tx.entryType === "gift_out" || Boolean(tx.senderName || tx.recipientName);
}

export function WalletTransactionReceiptSheet({ tx, open, onOpenChange }: Props) {
  if (!tx) return null;

  const signed =
    tx.kind === "in"
      ? `+${formatWalletTxAmount(tx.amount)}`
      : `−${formatWalletTxAmount(tx.amount)}`;

  const direction = tx.kind === "in" ? "Kirim" : "Chiqim";
  const gift = isGiftTx(tx);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-[28px] px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <SheetHeader className="text-left">
          <SheetTitle className="text-base font-bold">Tranzaksiya cheki</SheetTitle>
          <SheetDescription className="text-xs">
            Hamyon yozuvi. Yordam uchun ID ni nusxalang.
          </SheetDescription>
        </SheetHeader>

        {/* Amount hero */}
        <div className="mt-5 overflow-hidden rounded-[26px] border border-border/60 bg-card">
          <div className="bg-foreground px-5 pb-6 pt-5 text-background">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-background/15">
                {tx.kind === "in" ? (
                  <ArrowDownLeft className="h-5 w-5" strokeWidth={2.2} />
                ) : (
                  <ArrowUpRight className="h-5 w-5" strokeWidth={2.2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold leading-snug">{tx.title}</p>
                <p className="mt-0.5 text-[11px] text-background/65">
                  {direction} · {tx.date}
                </p>
              </div>
            </div>
            <p className="mt-5 text-center font-heading text-[2.15rem] font-bold tabular-nums tracking-tight">
              {signed}
            </p>
          </div>

          <div className="px-4">
            {gift && (tx.senderName || tx.recipientName) ? (
              <div className="space-y-0">
                {tx.senderName ? <DetailRow label="Yuboruvchi" value={tx.senderName} /> : null}
                {tx.recipientName ? <DetailRow label="Oluvchi" value={tx.recipientName} /> : null}
              </div>
            ) : null}

            {tx.message ? (
              <div className="border-b border-border/40 py-3 last:border-b-0">
                <p className="text-[11px] font-medium text-muted-foreground">Xabar</p>
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-foreground/90">
                  “{tx.message}”
                </p>
              </div>
            ) : null}

            <DetailRow label="Yo‘nalish" value={direction} />
            <DetailRow label="Summa" value={formatWalletTxAmount(tx.amount)} />
            <DetailRow label="Sana" value={tx.date} />

            {tx.adminAction ? (
              <div className="flex items-center gap-2.5 border-b border-border/40 py-3 last:border-b-0">
                <Shield className="size-4 shrink-0 text-muted-foreground" />
                <p className="text-[12px] font-semibold leading-snug">
                  {tx.adminReason?.trim() || "Admin harakati"}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="px-0.5 text-[11px] font-medium text-muted-foreground">Yordam uchun</p>
          <CopyIdRow value={tx.id} />
          <p className="px-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Supportga yozganda <span className="font-semibold text-foreground">Yozuv ID</span> ni
            yuboring.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
