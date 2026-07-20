import type { SubscriptionMe, SubscriptionUsage } from "@/lib/api/subscriptions";

export class MorphPlanLimitError extends Error {
  readonly code = "morph_plan_limit" as const;

  constructor(message: string) {
    super(message);
    this.name = "MorphPlanLimitError";
  }
}

export type MorphLimitKind = "tryon" | "studio";

export function isMorphPlanLimitError(error: unknown): error is MorphPlanLimitError {
  return error instanceof MorphPlanLimitError;
}

/** Server detail — obuna/oylik kvota (DRF throttle emas). */
export function isMorphPlanLimitMessage(message: string): boolean {
  return /Oylik Morph|Bepul Morph|obuna|Studio Plus|Bu reja Morph|Kunlik try-on|Kunlik AI tahlil/i.test(
    message,
  );
}

export function isMorphRateLimitMessage(message: string): boolean {
  if (isMorphPlanLimitMessage(message)) return false;
  return (
    /Request was throttled|throttl/i.test(message) ||
    /(?:available in|Expected available in)\s+\d+\s+seconds?/i.test(message) ||
    /soatiga \d+ ta/i.test(message)
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
    const retryHeader = res.headers.get("Retry-After");
    const retryFromHeader = retryHeader ? Number(retryHeader) : NaN;
    const waitMatch = /(?:available in|Expected available in)\s+(\d+)\s+seconds?/i.exec(detail);
    const seconds = Number.isFinite(retryFromHeader)
      ? retryFromHeader
      : waitMatch
        ? Number(waitMatch[1])
        : 0;
    if (seconds >= 60) {
      throw new Error(
        `Juda ko'p so'rov. Taxminan ${Math.ceil(seconds / 60)} daqiqadan keyin qayta urinib ko'ring.`,
      );
    }
    if (seconds > 0) {
      throw new Error(`Juda ko'p so'rov. Taxminan ${seconds} soniyadan keyin qayta urinib ko'ring.`);
    }
    throw new Error("Juda ko'p so'rov. Biroz kutib qayta urinib ko'ring.");
  }

  throw new Error(detail);
}

export function planLabelFromMe(me: SubscriptionMe | null): string | null {
  if (!me?.has_active) return null;
  const plan = me.subscription?.plan;
  if (!plan) return me.subscription?.plan_code ?? null;
  return plan.name_uz || plan.code;
}
