import { useCallback } from "react";
import { Alert } from "react-native";
import { MorphPlanLimitError } from "../api/ai";
import { useAuth } from "../auth/AuthContext";
import { useSubscriptions } from "./useSubscriptions";

type GateKind = "access" | "tryon" | "studio";

/**
 * Morph AI limit gate — web `useMorphLimitGate` bilan mos.
 * analyze/face_check usage oshirmaydi; tryon/studio oshiradi (serverda).
 */
export function useMorphLimitGate() {
  const { isAuthenticated } = useAuth();
  const { me, refresh, loading } = useSubscriptions();

  const ensure = useCallback(
    async (kind: GateKind): Promise<boolean> => {
      if (!isAuthenticated) {
        Alert.alert("Kirish kerak", "Morph AI uchun avval akkauntga kiring.");
        return false;
      }
      await refresh();
      // refresh async state — me eski bo'lishi mumkin, shuning uchun API dan qayta olamiz
      const { fetchSubscriptionMe } = await import("../api/subscriptions");
      let latest = me;
      try {
        latest = await fetchSubscriptionMe();
      } catch {
        /* keep me */
      }

      if (!latest?.has_active || latest.access?.morph_ai_allowed === false) {
        Alert.alert(
          "Obuna kerak",
          latest?.access?.message ||
            "Morph AI faqat obuna bilan ishlaydi. Tarif tanlang.",
        );
        return false;
      }

      const usage = latest.usage;
      if (kind === "tryon" || kind === "access") {
        if ((usage?.morph_ai_remaining ?? 0) <= 0 && (usage?.morph_ai_limit ?? 0) > 0) {
          Alert.alert(
            "Limit tugadi",
            `Oylik Morph AI limiti tugagan (${usage.morph_ai_used}/${usage.morph_ai_limit}). Plus yoki Pro ga o'ting.`,
          );
          return false;
        }
      }
      if (kind === "studio") {
        if ((usage?.morph_studio_limit ?? 0) <= 0) {
          Alert.alert(
            "Studio yo'q",
            "Studio Plus yoki Pro obunasida. Tarifni yangilang.",
          );
          return false;
        }
        if ((usage?.morph_studio_remaining ?? 0) <= 0) {
          Alert.alert(
            "Studio limiti",
            `Studio oylik limiti tugagan (${usage.morph_studio_used}/${usage.morph_studio_limit}).`,
          );
          return false;
        }
      }
      return true;
    },
    [isAuthenticated, me, refresh],
  );

  const handleError = useCallback((err: unknown): boolean => {
    if (err instanceof MorphPlanLimitError) {
      Alert.alert("Limit", err.message);
      return true;
    }
    return false;
  }, []);

  return {
    me,
    loading,
    refresh,
    ensureAccess: () => ensure("access"),
    ensureTryOn: () => ensure("tryon"),
    ensureStudio: () => ensure("studio"),
    handleError,
    remaining: me?.usage?.morph_ai_remaining ?? 0,
    limit: me?.usage?.morph_ai_limit ?? 0,
    studioRemaining: me?.usage?.morph_studio_remaining ?? 0,
    studioLimit: me?.usage?.morph_studio_limit ?? 0,
    allowed: Boolean(me?.has_active && me?.access?.morph_ai_allowed !== false),
  };
}
