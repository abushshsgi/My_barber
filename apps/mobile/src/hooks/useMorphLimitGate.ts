import { useCallback } from "react";
import { MorphPlanLimitError } from "../api/ai";
import { useAuth } from "../auth/AuthContext";
import { useSubscriptions } from "./useSubscriptions";

export type MorphGateReason = "login" | "subscription" | "limit" | "studio";
export type MorphGateResult = { ok: true } | { ok: false; reason: MorphGateReason };

type GateKind = "access" | "tryon" | "studio" | "chat";

/**
 * Morph AI limit gate.
 * analyze — ochiq; tryon — obuna kvotasi yoki referal krediti.
 */
export function useMorphLimitGate() {
  const { isAuthenticated } = useAuth();
  const { me, refresh, loading } = useSubscriptions();

  const ensureDetailed = useCallback(
    async (kind: GateKind): Promise<MorphGateResult> => {
      if (!isAuthenticated) {
        return { ok: false, reason: "login" };
      }

      await refresh();
      const { fetchSubscriptionMe } = await import("../api/subscriptions");
      let latest = me;
      try {
        latest = await fetchSubscriptionMe();
      } catch {
        /* keep me */
      }

      const credits =
        latest?.referral_credits ??
        latest?.access?.referral_credits ??
        latest?.usage?.referral_credits ??
        0;

      if (kind === "access") {
        // Selfie/tahlil — obunasiz ham ochiq
        return { ok: true };
      }

      if (kind === "chat") {
        const remaining = latest?.usage?.morph_chat_tokens_remaining;
        const limit = latest?.usage?.morph_chat_tokens_limit;
        if (typeof remaining === "number" && remaining <= 0 && (limit ?? 0) > 0) {
          return { ok: false, reason: "limit" };
        }
        if (latest?.access?.morph_chat_allowed === false) {
          return { ok: false, reason: "limit" };
        }
        return { ok: true };
      }

      if (kind === "studio") {
        if (!latest?.has_active || latest.access?.morph_ai_allowed === false) {
          return { ok: false, reason: "subscription" };
        }
        if ((latest.usage?.morph_studio_limit ?? 0) <= 0) {
          return { ok: false, reason: "studio" };
        }
        if ((latest.usage?.morph_studio_remaining ?? 0) <= 0) {
          return { ok: false, reason: "limit" };
        }
        return { ok: true };
      }

      // tryon
      if (latest?.has_active) {
        if ((latest.usage?.morph_ai_remaining ?? 0) <= 0 && (latest.usage?.morph_ai_limit ?? 0) > 0) {
          if (credits > 0) return { ok: true };
          return { ok: false, reason: "limit" };
        }
        return { ok: true };
      }

      if (credits > 0 || latest?.access?.morph_ai_allowed) {
        return { ok: true };
      }
      return { ok: false, reason: "subscription" };
    },
    [isAuthenticated, me, refresh],
  );

  const ensure = useCallback(
    async (kind: GateKind): Promise<boolean> => (await ensureDetailed(kind)).ok,
    [ensureDetailed],
  );

  const handleError = useCallback((err: unknown): boolean => {
    return err instanceof MorphPlanLimitError;
  }, []);

  const credits =
    me?.referral_credits ?? me?.access?.referral_credits ?? me?.usage?.referral_credits ?? 0;

  return {
    me,
    loading,
    refresh,
    ensureAccess: () => ensure("access"),
    ensureAccessDetailed: () => ensureDetailed("access"),
    ensureChat: () => ensure("chat"),
    ensureChatDetailed: () => ensureDetailed("chat"),
    ensureTryOn: () => ensure("tryon"),
    ensureTryOnDetailed: () => ensureDetailed("tryon"),
    ensureStudio: () => ensure("studio"),
    ensureStudioDetailed: () => ensureDetailed("studio"),
    handleError,
    remaining: (me?.usage?.morph_ai_remaining ?? 0) + (credits > 0 && !me?.has_active ? credits : 0),
    limit: me?.usage?.morph_ai_limit ?? 0,
    referralCredits: credits,
    studioRemaining: me?.usage?.morph_studio_remaining ?? 0,
    studioLimit: me?.usage?.morph_studio_limit ?? 0,
    allowed: Boolean(me?.has_active || credits > 0 || me?.access?.morph_ai_allowed),
  };
}
