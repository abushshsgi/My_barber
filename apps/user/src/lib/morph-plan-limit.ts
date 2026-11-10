import type { SubscriptionMe, SubscriptionUsage } from "@/lib/api/subscriptions";

export class MorphHairProfileRequiredError extends Error {
  readonly code = "hair_profile_required" as const;
  constructor(message: string) {
    super(message);
    this.name = "MorphHairProfileRequiredError";
  }
}

export class MorphPlanLimitError extends Error {
  readonly code = "morph_plan_limit" as const;

  constructor(message: string) {
    super(message);
    this.name = "MorphPlanLimitError";
  }
}

export type MorphLimitKind = "tryon" | "studio" | "access" | "chat" | "voice" | "care";

export function isMorphPlanLimitError(error: unknown): error is MorphPlanLimitError {
  return error instanceof MorphPlanLimitError;
}

/** Server detail — obuna/oylik kvota (DRF throttle emas). */
export function isMorphPlanLimitMessage(message: string): boolean {
  return /Oylik Morph|Oylik Morf|Bepul Morph|Bepul Morf|Morf AI faqat obuna|obuna|Studio Plus|Bu reja Morph|do'stingizni taklif|Tarifni yangilang|Plus\/Pro|chat token|kuyadi|1 000|yaratilmoqda|faqat 1 marta/i.test(
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

export function morphTryOnUsageBlocked(usage: SubscriptionUsage | undefined, me?: SubscriptionMe | null): boolean {
  if (me?.flash_tryon?.can_generate) return false;
  if (me?.access?.morph_ai_allowed === false) return true;
  const remaining = usage?.morph_ai_remaining;
  if (typeof remaining === "number") return remaining <= 0;
  const limit = usage?.morph_ai_limit ?? 0;
  if (limit <= 0) return true;
  return (usage?.morph_ai_used ?? 0) >= limit;
}

export function morphStudioUsageBlocked(usage: SubscriptionUsage): boolean {
  const limit = usage.morph_studio_limit ?? 0;
  if (limit <= 0) return true;
  return usage.morph_studio_remaining <= 0 || usage.morph_studio_used >= limit;
}

export function morphChatTokensBlocked(
  usage: SubscriptionUsage,
  me?: SubscriptionMe | null,
): boolean {
  if (me?.access?.morph_chat_allowed === true) return false;
  const limit = usage.morph_chat_tokens_limit;
  if (limit == null) return false;
  if (limit <= 0) return !(me?.has_active === true);
  return (usage.morph_chat_tokens_remaining ?? 0) < 200;
}

export function morphChatCanSend(
  usage: SubscriptionUsage | undefined,
  me?: SubscriptionMe | null,
  liveRemaining?: number | null,
): boolean {
  if (me?.access?.morph_chat_allowed === true) return true;
  if (me?.access?.morph_chat_allowed === false) return false;
  if (typeof liveRemaining === "number") return liveRemaining >= 200;
  if (!usage) return true;
  return !morphChatTokensBlocked(usage, me);
}

/** Try-on: obuna kvotasi yoki referal krediti. */
export function morphAccessBlocked(me: SubscriptionMe | null | undefined): boolean {
  if (!me) return true;
  if (me.flash_tryon?.can_generate) return false;
  if (me.access && typeof me.access.morph_ai_allowed === "boolean") {
    return !me.access.morph_ai_allowed;
  }
  const remaining = me.usage?.morph_ai_remaining ?? 0;
  const credits = me.referral_credits ?? me.access?.referral_credits ?? 0;
  const freeLeft =
    (me.access?.free_tryon_remaining ?? 0) > 0 ||
    me.access?.free_tryon_available === true ||
    me.free_tryon?.available === true;
  if (remaining > 0 || credits > 0 || freeLeft) return false;
  return !me.has_active;
}

export function morphStudioFeatureBlocked(me: SubscriptionMe | null | undefined): boolean {
  if (!me) return true;
  if (typeof me.access?.morph_studio_allowed === "boolean") {
    return !me.access.morph_studio_allowed;
  }
  return (me.usage?.morph_studio_limit ?? 0) <= 0;
}

export function morphCareBlocked(me: SubscriptionMe | null | undefined): boolean {
  if (!me) return true;
  if (typeof me.access?.morph_care_allowed === "boolean") {
    return !me.access.morph_care_allowed;
  }
  return me.morph_care !== true;
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
  if (res.status === 403 && code === "hair_profile_required") {
    throw new MorphHairProfileRequiredError(detail);
  }
  if (isMorphPlanLimitMessage(detail)) {
    throw new MorphPlanLimitError(detail);
  }

  if (res.status === 429 && isMorphRateLimitMessage(detail)) {
    // Soatlik / Google rate-limit — userga "kutish" ogohlantiruvi ko'rsatilmaydi.
    throw new Error("Morf AI hozir ishlamayapti. Keyinroq urinib ko'ring.");
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
