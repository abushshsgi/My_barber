import { useCallback } from "react";
import { MorphPlanLimitError } from "../api/ai";
import { useAuth } from "../auth/AuthContext";
import { useSubscriptions } from "./useSubscriptions";

export type MorphGateReason = "login" | "subscription" | "limit" | "studio";
export type MorphGateResult = { ok: true } | { ok: false; reason: MorphGateReason };

type GateKind = "access" | "tryon" | "studio";

/**
 * Morph AI limit gate — web `useMorphLimitGate` bilan mos.
 * analyze/face_check usage oshirmaydi; tryon/studio oshiradi (serverda).
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

      if (!latest?.has_active || latest.access?.morph_ai_allowed === false) {
        return { ok: false, reason: "subscription" };
      }

      const usage = latest.usage;
      if (kind === "tryon" || kind === "access") {
        if ((usage?.morph_ai_remaining ?? 0) <= 0 && (usage?.morph_ai_limit ?? 0) > 0) {
          return { ok: false, reason: "limit" };
        }
      }
      if (kind === "studio") {
        if ((usage?.morph_studio_limit ?? 0) <= 0) {
          return { ok: false, reason: "studio" };
        }
        if ((usage?.morph_studio_remaining ?? 0) <= 0) {
          return { ok: false, reason: "limit" };
        }
      }
      return { ok: true };
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

  return {
    me,
    loading,
    refresh,
    ensureAccess: () => ensure("access"),
    ensureAccessDetailed: () => ensureDetailed("access"),
    ensureTryOn: () => ensure("tryon"),
    ensureTryOnDetailed: () => ensureDetailed("tryon"),
    ensureStudio: () => ensure("studio"),
    ensureStudioDetailed: () => ensureDetailed("studio"),
    handleError,
    remaining: me?.usage?.morph_ai_remaining ?? 0,
    limit: me?.usage?.morph_ai_limit ?? 0,
    studioRemaining: me?.usage?.morph_studio_remaining ?? 0,
    studioLimit: me?.usage?.morph_studio_limit ?? 0,
    allowed: Boolean(me?.has_active && me?.access?.morph_ai_allowed !== false),
  };
}
