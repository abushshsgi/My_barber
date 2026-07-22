import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Shield } from "lucide-react";
import { WalletTransactionReceiptSheet } from "@/components/wallet/WalletTransactionReceiptSheet";
import { formatWalletTxAmount, type WalletTransaction } from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

export function WalletTransactionList({ items }: { items: WalletTransaction[] }) {
  const [selected, setSelected] = useState<WalletTransaction | null>(null);

  return (
    <>
      <ul className="space-y-2">
        {items.map((tx) => (
          <li key={tx.id}>
            <button
              type="button"
              onClick={() => setSelected(tx)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 text-left transition-transform active:scale-[0.99]"
            >
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                  tx.kind === "in" ? "bg-foreground text-background" : "bg-background",
                )}
              >
                {tx.kind === "in" ? (
                  <ArrowDownLeft className="h-4 w-4" strokeWidth={2.2} />
                ) : (
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold">{tx.title}</p>
                <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {tx.adminAction ? (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-900">
                      <Shield className="size-2.5" />
                      Admin
                    </span>
                  ) : null}
                  <span>{tx.date}</span>
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 text-[14px] font-bold tabular-nums",
                  tx.kind === "in" ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {tx.kind === "in" ? "+" : "−"}
                {formatWalletTxAmount(tx.amount)}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <WalletTransactionReceiptSheet
        tx={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
