import i18n from "@/i18n/config";

/** Obuna upgrade yo'nalishi — faol userlarga faqat keyingi tarif. */

export type UpgradePlanCode = "plus" | "pro";

const PLAN_RANK: Record<string, number> = {
  starter: 1,
  plus: 2,
  pro: 3,
};

export function nextUpgradePlan(code: string | null | undefined): UpgradePlanCode | null {
  const c = (code || "").toLowerCase();
  if (c === "starter") return "plus";
  if (c === "plus") return "pro";
  return null;
}

export function upgradeCtaLabel(code: string | null | undefined, hasActive: boolean): string {
  if (!hasActive) return i18n.t("subscriptions.payWithPayme");
  const next = nextUpgradePlan(code);
  if (next === "plus") return i18n.t("subscriptions.upgradeTo", { plan: "Plus" });
  if (next === "pro") return i18n.t("subscriptions.upgradeTo", { plan: "Pro" });
  return i18n.t("subscriptions.currentPlanCta");
}

/** Faol obunachi uchun faqat keyingi tarif: Starter → Plus, Plus → Pro. */
export function filterPlansForSubscriber<T extends { code: string }>(
  plans: T[],
  activeCode: string | null | undefined,
): T[] {
  const next = nextUpgradePlan(activeCode);
  if (!activeCode) return plans;
  if (!next) return [];
  return plans.filter((p) => p.code === next);
}

export function isPlanUpgrade(planCode: string, activeCode: string | null | undefined): boolean {
  if (!activeCode) return true;
  return (PLAN_RANK[planCode] ?? 0) > (PLAN_RANK[activeCode] ?? 0);
}
