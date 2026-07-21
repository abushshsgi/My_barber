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

function CopyRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
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
    <div className="flex items-start justify-between gap-3 border border-black/10 bg-white px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 break-all text-sm font-semibold text-black",
            mono && "font-mono tracking-wide tabular-nums",
          )}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="grid h-9 w-9 shrink-0 place-items-center border border-black/15 bg-black/[0.03] text-black transition-transform active:scale-95"
        aria-label="Copy"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
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

  const cardNumber = deposit.receiving_card.number || deposit.receiving_card.masked;
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
        className="max-h-[92dvh] overflow-y-auto rounded-none border-0 border-t border-black/10 bg-white px-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-0 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-black/20" />
        <SheetHeader className="space-y-1 px-5 pb-2 pt-4 text-left">
          <SheetTitle className="text-lg font-bold tracking-tight text-black">
            {t("topUpPage.cardTitle")}
          </SheetTitle>
          <SheetDescription className="text-sm text-black/50">
            {t("topUpPage.cardHint", { amount: displayAmount })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 px-5 pt-3">
          <div className="bg-black px-4 py-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              {t("topUpPage.transferAmount")}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
              {displayAmount} <span className="text-base font-semibold text-white/50">so'm</span>
            </p>
          </div>

          <CopyRow label={t("topUpPage.cardNumber")} value={cardNumber} mono />
          <CopyRow
            label={t("topUpPage.cardholder")}
            value={deposit.receiving_card.cardholder}
          />
          {deposit.receiving_card.bank ? (
            <CopyRow label={t("topUpPage.bank")} value={deposit.receiving_card.bank} />
          ) : null}
          <CopyRow
            label={t("topUpPage.transactionRef")}
            value={deposit.transaction_ref}
            mono
          />
          <CopyRow label={t("topUpPage.merchantRef")} value={deposit.merchant_ref} mono />

          <p className="border border-black/10 bg-black/[0.03] px-3.5 py-3 text-[12px] font-medium leading-relaxed text-black/65">
            {t("topUpPage.cardInstruction")}
          </p>
        </div>

        <div className="space-y-2 px-5 pt-4">
          {claimed ? (
            <div className="border border-black/15 bg-black/[0.04] px-4 py-3.5 text-sm font-semibold text-black">
              {t("topUpPage.claimedPending")}
            </div>
          ) : (
            <button
              type="button"
              disabled={claiming}
              onClick={onClaim}
              className="flex w-full items-center justify-center gap-2 bg-black py-4 text-sm font-bold text-white transition-opacity active:opacity-90 disabled:opacity-40"
            >
              {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("topUpPage.iPaid")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full border border-black/15 bg-white py-3.5 text-sm font-bold text-black/60"
          >
            {t("common.close", { defaultValue: "Yopish" })}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
