import { ArrowDownLeft, ArrowUpRight, ShieldAlert } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatWalletTxAmount, type WalletTransaction } from "@/lib/wallet-transactions";
import { formatPrice } from "@/lib/price-display";
import { cn } from "@/lib/utils";

type Props = {
  tx: WalletTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-2.5 last:border-b-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "max-w-[62%] text-right text-[12px] font-semibold break-all",
          mono && "font-mono text-[11px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function WalletTransactionReceiptSheet({ tx, open, onOpenChange }: Props) {
  if (!tx) return null;

  const signed =
    tx.kind === "in"
      ? `+${formatWalletTxAmount(tx.amount)}`
      : `−${formatWalletTxAmount(tx.amount)}`;

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
            Hamyon yozuvi — o‘zgartirilmaydigan ledger
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 rounded-[24px] border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid h-12 w-12 place-items-center rounded-2xl",
                tx.kind === "in" ? "bg-foreground text-background" : "bg-surface",
              )}
            >
              {tx.kind === "in" ? (
                <ArrowDownLeft className="h-5 w-5" strokeWidth={2.2} />
              ) : (
                <ArrowUpRight className="h-5 w-5" strokeWidth={2.2} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold">{tx.title}</p>
              {tx.subtitle ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{tx.subtitle}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">{tx.date}</p>
            </div>
          </div>

          <p
            className={cn(
              "mt-5 text-center font-heading text-3xl font-bold tabular-nums tracking-tight",
              tx.kind === "in" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {signed}
          </p>

          {tx.adminAction ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-950">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <p className="font-bold">Admin harakati</p>
                <p className="mt-0.5 opacity-90">
                  Bu yozuv platforma nazorati (hold / refund) natijasida yaratilgan.
                </p>
                {tx.adminReason ? (
                  <p className="mt-1.5 font-medium">Sabab: {tx.adminReason}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-[22px] border border-border/60 bg-surface/50 px-4">
          <Row label="Yo‘nalish" value={tx.kind === "in" ? "Kirim" : "Chiqim"} />
          {tx.entryType ? <Row label="Tur" value={tx.entryType} mono /> : null}
          {tx.referenceType ? <Row label="Reference" value={tx.referenceType} mono /> : null}
          {tx.referenceId ? <Row label="Merchant ID" value={tx.referenceId} mono /> : null}
          {tx.balanceAfter != null ? (
            <Row label="Keyingi balans" value={formatPrice(tx.balanceAfter)} />
          ) : null}
          {tx.entryHash ? (
            <Row label="Hash" value={tx.entryHash.slice(0, 24)} mono />
          ) : null}
          <Row label="Yozuv ID" value={tx.id} mono />
        </div>
      </SheetContent>
    </Sheet>
  );
}
