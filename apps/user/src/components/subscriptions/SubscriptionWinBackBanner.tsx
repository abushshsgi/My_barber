import { Link } from "@tanstack/react-router";
import { Clock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

/**
 * Trial / subscription win-back — shows when ≤1 day remains.
 */
export function SubscriptionWinBackBanner({ className }: { className?: string }) {
  const { t } = useTranslation();
  const meQ = useSubscriptionMe();
  const me = meQ.data;
  if (!me?.has_active) return null;

  const days =
    me.days_remaining ?? me.subscription?.days_remaining ?? null;
  if (days == null || days > 1) return null;

  const isTrial =
    Boolean(me.subscription?.is_trial) || me.subscription?.source === "referral_trial";

  return (
    <section className={cn("px-4", className)}>
      <div className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 sm:flex-row sm:items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-200">
          <Clock className="size-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight">
            {isTrial
              ? t("homePage.winBack.trialTitle", {
                  defaultValue: "Sinov tugashiga 24 soatdan kam",
                })
              : t("homePage.winBack.subTitle", {
                  defaultValue: "Obuna tez orada tugaydi",
                })}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t("homePage.winBack.hint", {
              defaultValue: "Morph AI ochiq qolishi uchun tarifni yangilang.",
            })}
          </p>
        </div>
        <Link
          to="/wallet"
          search={{
            section: "subscriptions",
            plan: me.subscription?.plan_code || "starter",
            returnTo: "/ai-style",
          }}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 text-[12px] font-bold text-background"
        >
          <Sparkles className="size-3.5" />
          {t("homePage.winBack.cta", { defaultValue: "Hozir yangilash" })}
        </Link>
      </div>
    </section>
  );
}
