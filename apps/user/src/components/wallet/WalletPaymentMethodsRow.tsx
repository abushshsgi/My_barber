import { Link } from "@tanstack/react-router";
import { ChevronRight, CreditCard, Plus, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { paymentMethods } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const ICONS = {
  card: CreditCard,
  click: Smartphone,
  payme: Smartphone,
} as const;

export function WalletPaymentMethodsRow() {
  const { t } = useTranslation();
  const primary = paymentMethods.find((pm) => pm.primary) ?? paymentMethods[0];

  return (
    <section className="mx-5 mt-8">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-bold">{t("walletPage.savedCards")}</h2>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {t("walletPage.savedCardsHint")}
          </p>
        </div>
        <Link
          to="/payment-methods"
          className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-foreground"
        >
          {t("walletPage.manageCards")}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="no-scrollbar -mx-0.5 flex gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5">
        {paymentMethods.map((pm) => {
          const Icon = ICONS[pm.type];
          return (
            <Link
              key={pm.id}
              to="/payment-methods"
              className={cn(
                "flex h-[54px] w-[98px] shrink-0 flex-col justify-between rounded-xl border px-2.5 py-2 active:scale-[0.98]",
                pm.primary ? "border-foreground bg-surface" : "border-border bg-background",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-background">
                  <Icon className="h-3 w-3" />
                </span>
                {pm.primary ? (
                  <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[7px] font-bold uppercase leading-none text-background">
                    {t("paymentMethods.primary")}
                  </span>
                ) : (
                  <span className="h-4 w-4" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold leading-tight">{pm.label}</p>
                <p className="truncate text-[9px] leading-tight text-muted-foreground">{pm.detail}</p>
              </div>
            </Link>
          );
        })}
        <Link
          to="/payment-methods"
          className="flex h-[54px] w-[54px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-background active:scale-[0.98]"
          aria-label={t("paymentMethods.add")}
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[8px] font-bold text-muted-foreground">{t("paymentMethods.add")}</span>
        </Link>
      </div>

      {primary ? (
        <p className="mt-1.5 text-[9px] text-muted-foreground">
          {t("walletPage.defaultPayment", { method: primary.label })}
        </p>
      ) : null}
    </section>
  );
}
