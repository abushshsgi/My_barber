import { Link } from "@tanstack/react-router";
import { ChevronRight, CreditCard, Plus, Smartphone, Wallet as WalletIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useWalletMe } from "@/hooks/use-wallet";
import { parseWalletBalance } from "@/lib/api/wallet";

export function WalletPaymentMethodsRow({
  className,
  variant = "mobile",
}: {
  className?: string;
  variant?: "mobile" | "desktop";
}) {
  const { t } = useTranslation();
  const { data: wallet } = useWalletMe();
  const balance = wallet ? parseWalletBalance(wallet.balance) : 0;
  const isDesktop = variant === "desktop";

  return (
    <section className={cn("mx-5 mt-8", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className={cn("font-bold", isDesktop ? "text-sm" : "text-[13px]")}>
            {t("walletPage.savedCards")}
          </h2>
          <p className={cn("mt-0.5 truncate text-muted-foreground", isDesktop ? "text-xs" : "text-[10px]")}>
            {t("walletPage.savedCardsHint")}
          </p>
        </div>
        <Link
          to="/payment-methods"
          className={cn(
            "inline-flex shrink-0 items-center gap-0.5 font-bold text-foreground",
            isDesktop ? "text-xs" : "text-[10px]",
          )}
        >
          {t("walletPage.manageCards")}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div
        className={cn(
          isDesktop
            ? "grid grid-cols-2 gap-3"
            : "no-scrollbar -mx-0.5 flex gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5",
        )}
      >
        {wallet ? (
          <Link
            to="/payment-methods"
            className={cn(
              "flex flex-col justify-between rounded-xl border active:scale-[0.98]",
              "border-foreground bg-surface",
              isDesktop ? "min-h-[88px] px-4 py-3" : "h-[54px] w-[120px] shrink-0 px-2.5 py-2",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-background">
                <WalletIcon className="h-3 w-3" />
              </span>
              <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[7px] font-bold uppercase leading-none text-background">
                {t("paymentMethods.primary")}
              </span>
            </div>
            <div className="min-w-0">
              <p className={cn("truncate font-bold leading-tight", isDesktop ? "text-sm" : "text-[10px]")}>
                {wallet.card.card_display}
              </p>
              <p className={cn("truncate leading-tight text-muted-foreground", isDesktop ? "text-xs" : "text-[9px]")}>
                {balance.toLocaleString("uz-UZ")} so'm
              </p>
            </div>
          </Link>
        ) : null}

        {(["click", "payme"] as const).map((id) => (
          <Link
            key={id}
            to="/payment-methods"
            className={cn(
              "flex flex-col justify-between rounded-xl border border-border bg-background active:scale-[0.98]",
              isDesktop ? "min-h-[88px] px-4 py-3" : "h-[54px] w-[98px] shrink-0 px-2.5 py-2",
            )}
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-surface">
              <Smartphone className="h-3 w-3" />
            </span>
            <p className={cn("truncate font-bold uppercase leading-tight", isDesktop ? "text-sm" : "text-[10px]")}>
              {id}
            </p>
          </Link>
        ))}

        <Link
          to="/payment-methods"
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-background active:scale-[0.98]",
            isDesktop ? "min-h-[88px]" : "h-[54px] w-[54px] shrink-0",
          )}
          aria-label={t("paymentMethods.add")}
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn("font-bold text-muted-foreground", isDesktop ? "text-xs" : "text-[8px]")}>
            {t("paymentMethods.add")}
          </span>
        </Link>
      </div>

      {wallet ? (
        <p className={cn("mt-1.5 text-muted-foreground", isDesktop ? "text-xs" : "text-[9px]")}>
          {t("walletPage.defaultPayment", { method: wallet.card.card_display })}
        </p>
      ) : null}
    </section>
  );
}
