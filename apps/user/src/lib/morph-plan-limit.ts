import type { SubscriptionMe, SubscriptionUsage } from "@/lib/api/subscriptions";

export class MorphPlanLimitError extends Error {
  readonly code = "morph_plan_limit" as const;

  constructor(message: string) {
    super(message);
    this.name = "MorphPlanLimitError";
  }
}

export type MorphLimitKind = "tryon" | "studio" | "access" | "chat";

export function isMorphPlanLimitError(error: unknown): error is MorphPlanLimitError {
  return error instanceof MorphPlanLimitError;
}

/** Server detail — obuna/oylik kvota (DRF throttle emas). */
export function isMorphPlanLimitMessage(message: string): boolean {
  return /Oylik Morph|Oylik Morf|Bepul Morph|Morph AI faqat obuna|obuna|Studio Plus|Bu reja Morph|do'stingizni taklif|Tarifni yangilang|Plus\/Pro|chat token/i.test(
    message,
  );
}

export function isMorphRateLimitMessage(message: string): boolean {
  if (isMorphPlanLimitMessage(message)) return false;
  return (
    /Request was throttled|throttl/i.test(message) ||
    /(?:available in|Expected available in)\s+\d+\s+seconds?/i.test(message) ||
    /soatiga \d+ ta/i.test(message) ||
    /Juda ko'p so'rov/i.test(message)
  );
}

export function morphTryOnUsageBlocked(usage: SubscriptionUsage): boolean {
  const limit = usage.morph_ai_limit ?? 0;
  if (limit <= 0) return true;
  return usage.morph_ai_remaining <= 0 || usage.morph_ai_used >= limit;
}

export function morphStudioUsageBlocked(usage: SubscriptionUsage): boolean {
  const limit = usage.morph_studio_limit ?? 0;
  if (limit <= 0) return true;
  return usage.morph_studio_remaining <= 0 || usage.morph_studio_used >= limit;
}

export function morphChatTokensBlocked(usage: SubscriptionUsage): boolean {
  const limit = usage.morph_chat_tokens_limit;
  if (limit == null) return false;
  if (limit <= 0) return true;
  return (usage.morph_chat_tokens_remaining ?? 0) <= 0;
}

/** Yangi user — faol obuna (yoki trial) bo'lmasa Morph AI yopiq. */
export function morphAccessBlocked(me: SubscriptionMe | null | undefined): boolean {
  if (!me) return true;
  if (me.access && typeof me.access.morph_ai_allowed === "boolean") {
    return !me.access.morph_ai_allowed;
  }
  return !me.has_active;
}

export function throwFromMorphApiError(res: Response, body: unknown, fallback: string): never {
  const record =
    body && typeof body === "object" ? (body as { detail?: string; code?: string }) : null;
  const detail =
    record && typeof record.detail === "string" && record.detail.trim()
      ? record.detail.trim()
      : fallback;
  const code = record && typeof record.code === "string" ? record.code : "";

  if (res.status === 403 && code === "morph_plan_limit") {
    throw new MorphPlanLimitError(detail);
  }
  if (isMorphPlanLimitMessage(detail)) {
    throw new MorphPlanLimitError(detail);
  }

  if (res.status === 429 && isMorphRateLimitMessage(detail)) {
    // Soatlik / Google rate-limit — userga "kutish" ogohlantiruvi ko'rsatilmaydi.
    throw new Error("Morph AI hozir ishlamayapti. Keyinroq urinib ko'ring.");
  }

  throw new Error(detail);
}

export function planLabelFromMe(me: SubscriptionMe | null, lang?: string): string | null {
  if (!me?.has_active) return null;
  const plan = me.subscription?.plan;
  if (!plan) return me.subscription?.plan_code ?? null;
  const l = (lang || "uz").slice(0, 2).toLowerCase();
  if (l === "ru") return plan.name_ru || plan.name_uz || plan.code;
  if (l === "en") return plan.name_en || plan.name_uz || plan.code;
  return plan.name_uz || plan.code;
}
