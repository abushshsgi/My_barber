import { Check, Copy, CreditCard, Loader2, Zap } from "lucide-react";
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

export type TopUpMethod = "click" | "payme" | "card";

type MethodSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountLabel: string;
  onSelect: (method: TopUpMethod) => void;
  busy?: boolean;
  providerReady?: { click: boolean; payme: boolean };
};

const METHODS: {
  id: TopUpMethod;
  label: string;
  hintKey: string;
  accent: string;
  iconBg: string;
  Icon: typeof Zap;
}[] = [
  {
    id: "click",
    label: "Click",
    hintKey: "topUpPage.methodClickHint",
    accent: "border-[#00C853]/40 bg-[#00C853]/8",
    iconBg: "bg-[#00C853]/15 text-[#007A33]",
    Icon: Zap,
  },
  {
    id: "payme",
    label: "Payme",
    hintKey: "topUpPage.methodPaymeHint",
    accent: "border-[#00BCD4]/40 bg-[#00BCD4]/8",
    iconBg: "bg-[#00BCD4]/15 text-[#007C8A]",
    Icon: Zap,
  },
  {
    id: "card",
    label: "Karta",
    hintKey: "topUpPage.methodCardHint",
    accent: "border-amber-500/35 bg-amber-500/8",
    iconBg: "bg-amber-500/15 text-amber-900",
    Icon: CreditCard,
  },
];

export function TopUpMethodSheet({
  open,
  onOpenChange,
  amountLabel,
  onSelect,
  busy,
  providerReady = { click: false, payme: false },
}: MethodSheetProps) {
  const { t } = useTranslation();

  const isReady = (id: TopUpMethod) => {
    if (id === "card") return true;
    return Boolean(providerReady[id]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="max-h-[88dvh] overflow-y-auto rounded-t-[28px] border-0 bg-[oklch(0.985_0.008_85)] px-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-0 shadow-[0_-12px_40px_-12px_oklch(0.2_0.02_60/0.28)]"
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-foreground/15" />
        <SheetHeader className="space-y-1 px-5 pb-2 pt-4 text-left">
          <SheetTitle className="text-lg font-bold tracking-tight">
            {t("topUpPage.chooseMethod")}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {t("topUpPage.chooseMethodHint", { amount: amountLabel })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2.5 px-5 pt-2">
          {METHODS.map((m) => {
            const ready = isReady(m.id);
            return (
              <button
                key={m.id}
                type="button"
                disabled={busy || !ready}
                onClick={() => onSelect(m.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
                  m.accent,
                )}
              >
                <span className={cn("grid h-11 w-11 place-items-center rounded-xl", m.iconBg)}>
                  <m.Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground">{m.label}</span>
                  <span className="mt-0.5 block text-[12px] font-medium text-muted-foreground">
                    {ready ? t(m.hintKey) : t("topUpPage.comingSoon")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-5 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-2xl border border-border/80 bg-white/70 py-3.5 text-sm font-bold text-muted-foreground"
          >
            {t("common.cancel", { defaultValue: "Bekor qilish" })}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-white/80 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 break-all text-sm font-semibold text-foreground",
            mono && "font-mono tracking-wide tabular-nums",
          )}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-foreground transition-transform active:scale-95"
        aria-label="Copy"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] border-0 bg-[oklch(0.985_0.008_85)] px-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-0 shadow-[0_-12px_40px_-12px_oklch(0.2_0.02_60/0.28)]"
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-foreground/15" />
        <SheetHeader className="space-y-1 px-5 pb-2 pt-4 text-left">
          <SheetTitle className="text-lg font-bold tracking-tight">
            {t("topUpPage.cardTitle")}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {t("topUpPage.cardHint", { amount: amountLabel })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2.5 px-5 pt-3">
          <div
            className="rounded-[22px] px-4 py-4 text-background"
            style={{
              background:
                "linear-gradient(145deg, oklch(0.22 0.02 55), oklch(0.14 0.015 50) 55%, oklch(0.18 0.03 70))",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-background/55">
              {t("topUpPage.transferAmount")}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
              {amountLabel} <span className="text-base font-semibold opacity-60">so'm</span>
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

          <p className="rounded-2xl bg-amber-500/10 px-3.5 py-3 text-[12px] font-medium leading-relaxed text-amber-950/80">
            {t("topUpPage.cardInstruction")}
          </p>
        </div>

        <div className="space-y-2 px-5 pt-4">
          {claimed ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 text-sm font-semibold text-emerald-900">
              {t("topUpPage.claimedPending")}
            </div>
          ) : (
            <button
              type="button"
              disabled={claiming}
              onClick={onClaim}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[oklch(0.22_0.02_55)] py-4 text-sm font-bold text-[oklch(0.97_0.01_85)] transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("topUpPage.iPaid")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-2xl border border-border/80 bg-white/70 py-3.5 text-sm font-bold text-muted-foreground"
          >
            {t("common.close", { defaultValue: "Yopish" })}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
