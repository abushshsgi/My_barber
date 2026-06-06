import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatWalletTxAmount, type WalletTransaction } from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

export function WalletTransactionList({ items }: { items: WalletTransaction[] }) {
  return (
    <ul className="space-y-2">
      {items.map((tx) => (
        <li
          key={tx.id}
          className="flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3"
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
            <p className="text-[10px] text-muted-foreground">{tx.date}</p>
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
        </li>
      ))}
    </ul>
  );
}
