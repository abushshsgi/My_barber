import { createFileRoute } from "@tanstack/react-router";
import { Check, Repeat } from "lucide-react";
import { useTranslation } from "react-i18next";
import { subscriptionPlans, formatPrice, getUserSubscription } from "@/lib/mock-data";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({ meta: [{ title: "Obunalar — mysaloon.uz" }] }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { t } = useTranslation();
  const userPlan = getUserSubscription();

  return (
    <ProfileSubpageLayout
      title={t("subscriptions.title")}
      subtitle={t("subscriptions.subtitle")}
    >
      <div className="space-y-4">
        {subscriptionPlans.map((plan) => {
          const isActive = userPlan?.id === plan.id;
          return (
          <div
            key={plan.id}
            className={cn(
              "overflow-hidden rounded-2xl border p-5",
              isActive ? "border-foreground bg-surface" : "border-border",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  <h3 className="text-base font-bold">{plan.name}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("subscriptions.visitsPerMonth", { count: plan.visits })}
                </p>
              </div>
              {isActive && (
                <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase text-background">
                  {t("subscriptions.active")}
                </span>
              )}
            </div>

            <p className="mt-4 text-2xl font-bold">{formatPrice(plan.priceMonthly)}</p>
            <p className="text-[11px] font-bold text-muted-foreground">{t("subscriptions.perMonth")}</p>

            <ul className="mt-4 space-y-2">
              {plan.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            {!isActive && (
              <button
                type="button"
                className="mt-4 w-full rounded-2xl bg-foreground py-3 text-sm font-bold text-background"
              >
                {t("subscriptions.subscribe")}
              </button>
            )}
          </div>
          );
        })}
      </div>
    </ProfileSubpageLayout>
  );
}
