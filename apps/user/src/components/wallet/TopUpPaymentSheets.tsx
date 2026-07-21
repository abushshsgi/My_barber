import { Check, Copy, ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
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
  onClaim: (receipt: File) => void;
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
  const inputId = useId();
  const [receipt, setReceipt] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReceipt(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!deposit) return null;

  const claimed = deposit.status === "claimed" || deposit.status === "approved";
  const existingReceipt = deposit.receipt_url || null;
  const displayAmount =
    amountLabel ||
    new Intl.NumberFormat("uz-UZ").format(
      typeof deposit.amount === "number" ? deposit.amount : Number(deposit.amount) || 0,
    );

  const onPick = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("topUpPage.receiptTypeError"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("topUpPage.receiptSizeError"));
      return;
    }
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setReceipt(file);
  };

  const clearReceipt = () => {
    setReceipt(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

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

        <div className="space-y-3 px-5 pt-5">
          {claimed ? (
            <>
              {(previewUrl || existingReceipt) && (
                <a
                  href={previewUrl || existingReceipt || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden border border-black/10"
                >
                  <img
                    src={previewUrl || existingReceipt || ""}
                    alt={t("topUpPage.receiptAlt")}
                    className="max-h-48 w-full object-contain bg-black/[0.03]"
                  />
                </a>
              )}
              <div className="border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold leading-snug text-black">
                {t("topUpPage.claimedPending")}
              </div>
            </>
          ) : (
            <>
              <input
                id={inputId}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />

              {previewUrl ? (
                <div className="relative overflow-hidden border border-black/15">
                  <img
                    src={previewUrl}
                    alt={t("topUpPage.receiptAlt")}
                    className="max-h-52 w-full object-contain bg-black/[0.03]"
                  />
                  <button
                    type="button"
                    onClick={clearReceipt}
                    className="absolute right-2 top-2 grid h-8 w-8 cursor-pointer place-items-center bg-black text-white"
                    aria-label={t("topUpPage.receiptRemove")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor={inputId}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-black/25 bg-black/[0.02] px-4 py-7 text-center transition-colors duration-200 hover:border-black/40 hover:bg-black/[0.04]"
                >
                  <ImagePlus className="h-6 w-6 text-black/50" />
                  <span className="text-sm font-bold text-black">{t("topUpPage.receiptUpload")}</span>
                  <span className="text-[11px] font-medium text-black/45">
                    {t("topUpPage.receiptHint")}
                  </span>
                </label>
              )}

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <button
                  type="button"
                  disabled={claiming || !receipt}
                  onClick={() => {
                    if (!receipt) {
                      toast.error(t("topUpPage.receiptRequired"));
                      return;
                    }
                    onClaim(receipt);
                  }}
                  className="flex cursor-pointer items-center justify-center gap-2 bg-black py-4 text-sm font-bold text-white transition-opacity duration-200 active:opacity-90 disabled:opacity-40"
                >
                  {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("topUpPage.iPaid")}
                </button>
                <label
                  htmlFor={inputId}
                  className={cn(
                    "grid h-full min-w-[3.5rem] cursor-pointer place-items-center border border-black/15 bg-white text-black transition-colors duration-200 hover:border-black/30",
                    claiming && "pointer-events-none opacity-40",
                  )}
                  title={t("topUpPage.receiptUpload")}
                >
                  <ImagePlus className="h-5 w-5" />
                </label>
              </div>
            </>
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
