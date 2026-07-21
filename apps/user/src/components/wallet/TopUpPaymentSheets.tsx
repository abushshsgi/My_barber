import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CardDeposit } from "@/lib/api/payments";
import { cn } from "@/lib/utils";

type CardSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deposit: CardDeposit | null;
  amountLabel: string;
  onClaim: () => void;
  claiming?: boolean;
};

function CopyChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Nusxa olindi");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Nusxa olinmadi");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={cn(
        "group flex w-full cursor-pointer items-center justify-between gap-3 border border-black/10 bg-white px-4 py-3.5 text-left transition-colors duration-200",
        "hover:border-black/25 hover:bg-black/[0.02] active:scale-[0.99]",
        copied && "border-black bg-black text-white",
      )}
      aria-label={`${label}: ${value}`}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.18em]",
            copied ? "text-white/55" : "text-black/40",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "mt-1.5 break-all font-mono text-[15px] font-semibold tracking-wide tabular-nums",
            copied ? "text-white" : "text-black",
          )}
        >
          {value}
        </p>
      </div>
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center transition-colors",
          copied ? "text-white" : "text-black/50 group-hover:text-black",
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </span>
    </button>
  );
}

export function TopUpCardSheet({
  open,
  onOpenChange,
  deposit,
  amountLabel,
  onClaim,
  claiming,
}: CardSheetProps) {
  const { t } = useTranslation();
  if (!deposit) return null;

  const claimed = deposit.status === "claimed" || deposit.status === "approved";
  const displayAmount =
    amountLabel ||
    new Intl.NumberFormat("uz-UZ").format(
      typeof deposit.amount === "number" ? deposit.amount : Number(deposit.amount) || 0,
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="max-h-[92dvh] overflow-y-auto rounded-none border-0 border-t border-black/10 bg-white px-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-0 shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.28)]"
      >
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-black/20" />

        <SheetHeader className="space-y-1 px-5 pb-1 pt-5 text-left">
          <SheetTitle className="text-xl font-bold tracking-tight text-black">
            {t("topUpPage.cardTitle")}
          </SheetTitle>
          <SheetDescription className="text-sm leading-relaxed text-black/50">
            {t("topUpPage.cardHint", { amount: displayAmount })}
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pt-5">
          <div className="relative overflow-hidden border border-black bg-black px-5 py-6 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 12% 20%, #fff 0.6px, transparent 0.7px), radial-gradient(circle at 88% 72%, #fff 0.6px, transparent 0.7px)",
                backgroundSize: "18px 18px",
              }}
            />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
              {t("topUpPage.transferAmount")}
            </p>
            <p className="relative mt-3 text-4xl font-bold tabular-nums tracking-tight">
              {displayAmount}
              <span className="ml-2 text-lg font-semibold text-white/45">so'm</span>
            </p>
          </div>

          <div className="mt-3 space-y-2">
            <CopyChip
              label={t("topUpPage.transactionRef")}
              value={deposit.transaction_ref}
            />
            <CopyChip label={t("topUpPage.merchantRef")} value={deposit.merchant_ref} />
          </div>

          <p className="mt-4 text-[12px] font-medium leading-relaxed text-black/55">
            {t("topUpPage.cardInstruction")}
          </p>
        </div>

        <div className="space-y-2 px-5 pt-5">
          {claimed ? (
            <div className="border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold leading-snug text-black">
              {t("topUpPage.claimedPending")}
            </div>
          ) : (
            <button
              type="button"
              disabled={claiming}
              onClick={onClaim}
              className="flex w-full cursor-pointer items-center justify-center gap-2 bg-black py-4 text-sm font-bold text-white transition-opacity duration-200 active:opacity-90 disabled:opacity-40"
            >
              {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("topUpPage.iPaid")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full cursor-pointer border border-black/12 bg-transparent py-3.5 text-sm font-bold text-black/55 transition-colors duration-200 hover:border-black/25 hover:text-black"
          >
            {t("common.close", { defaultValue: "Yopish" })}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
