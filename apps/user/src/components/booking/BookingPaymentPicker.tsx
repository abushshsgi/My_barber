import { Banknote, CreditCard, Wallet } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/mock-data";

export type BookingPaymentMethod = "cash" | "online";

type Props = {
  value: BookingPaymentMethod;
  onChange: (value: BookingPaymentMethod) => void;
  total: number;
  walletBalance: number | null;
  walletLoading?: boolean;
  className?: string;
};

export function BookingPaymentPicker({
  value,
  onChange,
  total,
  walletBalance,
  walletLoading,
  className,
}: Props) {
  const balance = walletBalance ?? 0;
  const canPayOnline = balance >= total;

  return (
    <div className={className}>
      <h2 className="text-xl font-bold">To&apos;lov usuli</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Naqd — salonda to&apos;laysiz. Onlayn — hamyon balansidan yechiladi va sartarosh daromadiga tushadi.
      </p>
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => onChange("cash")}
          className={cn(
            "flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
            value === "cash" ? "border-foreground bg-surface" : "border-transparent bg-surface",
          )}
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-background">
            <Banknote className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold">Naqd</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Salonda to&apos;lov — platforma daromadiga kirmaydi</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange("online")}
          className={cn(
            "flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
            value === "online" ? "border-foreground bg-surface" : "border-transparent bg-surface",
          )}
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-background">
            <CreditCard className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Onlayn (hamyon)</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {walletLoading
                ? "Balans tekshirilmoqda…"
                : `Balans: ${formatPrice(balance)} · kerak: ${formatPrice(total)}`}
            </p>
            {!walletLoading && !canPayOnline ? (
              <Link
                to="/wallet/top-up"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Wallet className="size-3" />
                Hamyonni to&apos;ldirish
              </Link>
            ) : null}
          </div>
        </button>
      </div>
    </div>
  );
}
