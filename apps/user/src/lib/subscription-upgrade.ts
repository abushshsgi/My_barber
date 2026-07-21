/** Obuna upgrade yo'nalishi — faol userlarga faqat yuqori tarif. */

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

export function upgradeCtaLabel(
  code: string | null | undefined,
  hasActive: boolean,
): string {
  if (!hasActive) return "Obuna olish";
  const next = nextUpgradePlan(code);
  if (next === "plus") return "Plus ga upgrade";
  if (next === "pro") return "Pro ga upgrade";
  return "Obunani boshqarish";
}

/** Faol obunachi uchun ko'rsatiladigan tariflar (faqat yuqoriroq). */
export function filterPlansForSubscriber<T extends { code: string }>(
  plans: T[],
  activeCode: string | null | undefined,
): T[] {
  if (!activeCode) return plans;
  const rank = PLAN_RANK[activeCode] ?? 0;
  return plans.filter((p) => (PLAN_RANK[p.code] ?? 0) > rank);
}

export function isPlanUpgrade(
  planCode: string,
  activeCode: string | null | undefined,
): boolean {
  if (!activeCode) return true;
  return (PLAN_RANK[planCode] ?? 0) > (PLAN_RANK[activeCode] ?? 0);
}
