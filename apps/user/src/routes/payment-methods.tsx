import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Plus, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { paymentMethods } from "@/lib/mock-data";
import {
  ProfileSubpageCard,
  ProfileSubpageLayout,
} from "@/components/profile/ProfileSubpageLayout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/payment-methods")({
  head: () => ({ meta: [{ title: "To'lov usullari — mysaloon.uz" }] }),
  component: PaymentMethodsPage,
});

const ICONS = {
  card: CreditCard,
  click: Smartphone,
  payme: Smartphone,
} as const;

function PaymentMethodsPage() {
  const { t } = useTranslation();

  return (
    <ProfileSubpageLayout title={t("paymentMethods.title")} subtitle={t("paymentMethods.mockNote")}>
      <div className="space-y-3">
        {paymentMethods.map((pm) => {
          const Icon = ICONS[pm.type];
          return (
            <ProfileSubpageCard
              key={pm.id}
              className={cn(pm.primary && "border-foreground bg-surface/50")}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{pm.label}</p>
                    {pm.primary && (
                      <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase text-background">
                        {t("paymentMethods.primary")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{pm.detail}</p>
                </div>
              </div>
            </ProfileSubpageCard>
          );
        })}

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background py-4 text-sm font-bold text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
          {t("paymentMethods.add")}
        </button>
      </div>
    </ProfileSubpageLayout>
  );
}
