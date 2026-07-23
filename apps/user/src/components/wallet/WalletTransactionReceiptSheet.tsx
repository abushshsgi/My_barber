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

function CopyIdButton({ value, label }: { value: string; label: string }) {
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
      className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-surface/60 px-3.5 py-3 text-left transition-colors active:bg-surface"
      title="Nusxa olish"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-all font-mono text-[12px] font-semibold tracking-tight">{value}</p>
      </div>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl",
          copied ? "bg-emerald-500/15 text-emerald-700" : "bg-background text-muted-foreground",
        )}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </span>
    </button>
  );
}

export function WalletTransactionReceiptSheet({ tx, open, onOpenChange }: Props) {
  if (!tx) return null;

  const signed =
    tx.kind === "in"
      ? `+${formatWalletTxAmount(tx.amount)}`
      : `−${formatWalletTxAmount(tx.amount)}`;

  const direction = tx.kind === "in" ? "Kirim" : "Chiqim";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-[28px] px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <SheetHeader className="text-left">
          <SheetTitle className="text-base font-bold">Tranzaksiya cheki</SheetTitle>
          <SheetDescription className="text-xs">
            Yordam kerak bo‘lsa, pastdagi ID ni nusxalang.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 rounded-[24px] border border-border/70 bg-card p-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                tx.kind === "in" ? "bg-foreground text-background" : "bg-surface",
              )}
            >
              {tx.kind === "in" ? (
                <ArrowDownLeft className="h-5 w-5" strokeWidth={2.2} />
              ) : (
                <ArrowUpRight className="h-5 w-5" strokeWidth={2.2} />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-[15px] font-bold leading-snug">{tx.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {direction} · {tx.date}
              </p>
            </div>
          </div>

          <p
            className={cn(
              "mt-6 text-center font-heading text-[2rem] font-bold tabular-nums tracking-tight",
              tx.kind === "in" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {signed}
          </p>

          {tx.adminAction ? (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-[12px] text-amber-950">
              <Shield className="size-4 shrink-0 text-amber-800" />
              <p className="font-semibold leading-snug">
                {tx.adminReason?.trim() || "Admin harakati"}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <p className="px-0.5 text-[11px] font-medium text-muted-foreground">Yordam uchun</p>
          <CopyIdButton label="Yozuv ID" value={tx.id} />
        </div>

        <p className="mt-3 px-0.5 text-[11px] leading-relaxed text-muted-foreground">
          Supportga yozganda <span className="font-semibold text-foreground">Yozuv ID</span> ni
          yuboring — shu orqali yozuv topiladi.
        </p>
      </SheetContent>
    </Sheet>
  );
}
