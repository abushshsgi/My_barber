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
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">{t("walletPage.savedCards")}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("walletPage.savedCardsHint")}</p>
        </div>
        <Link
          to="/payment-methods"
          className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-foreground"
        >
          {t("walletPage.manageCards")}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {paymentMethods.map((pm) => {
          const Icon = ICONS[pm.type];
          return (
            <Link
              key={pm.id}
              to="/payment-methods"
              className={cn(
                "flex min-w-[132px] shrink-0 flex-col gap-3 rounded-2xl border p-3 active:scale-[0.98]",
                pm.primary ? "border-foreground bg-surface" : "border-border bg-background",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-background">
                  <Icon className="h-4 w-4" />
                </div>
                {pm.primary && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[8px] font-bold uppercase text-background">
                    {t("paymentMethods.primary")}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[13px] font-bold">{pm.label}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{pm.detail}</p>
              </div>
            </Link>
          );
        })}
        <Link
          to="/payment-methods"
          className="flex min-w-[100px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background p-3 active:scale-[0.98]"
        >
          <Plus className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground">{t("paymentMethods.add")}</span>
        </Link>
      </div>

      {primary && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {t("walletPage.defaultPayment", { method: primary.label })}
        </p>
      )}
    </section>
  );
}
