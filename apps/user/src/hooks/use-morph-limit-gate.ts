import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { fetchSubscriptionMe, type SubscriptionMe } from "@/lib/api/subscriptions";
import {
  morphAccessBlocked,
  morphChatTokensBlocked,
  morphStudioUsageBlocked,
  morphTryOnUsageBlocked,
  type MorphLimitKind,
} from "@/lib/morph-plan-limit";

type EnsureOpts = {
  /** Avto try-on — sheet ochmaslik */
  silent?: boolean;
};

export function useMorphLimitGate() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MorphLimitKind>("access");
  const [me, setMe] = useState<SubscriptionMe | null>(null);

  const refreshMe = useCallback(async () => {
    return qc.fetchQuery({
      queryKey: ["subscriptions", "me"],
      queryFn: fetchSubscriptionMe,
      staleTime: 0,
    });
  }, [qc]);

  const showLimit = useCallback((nextKind: MorphLimitKind, data: SubscriptionMe) => {
    setKind(nextKind);
    setMe(data);
    setOpen(true);
  }, []);

  const ensureAccess = useCallback(
    async (opts?: EnsureOpts): Promise<boolean> => {
      try {
        const data = await refreshMe();
        if (!morphAccessBlocked(data)) return true;
        if (!opts?.silent) showLimit("access", data);
        return false;
      } catch {
        // Offline / auth — server baribir to'sadi.
        return true;
      }
    },
    [refreshMe, showLimit],
  );

  const ensureTryOn = useCallback(
    async (opts?: EnsureOpts): Promise<boolean> => {
      try {
        const data = await refreshMe();
        if (morphAccessBlocked(data)) {
          if (!opts?.silent) showLimit("access", data);
          return false;
        }
        if (!morphTryOnUsageBlocked(data.usage)) return true;
        if (!opts?.silent) showLimit("tryon", data);
        return false;
      } catch {
        return true;
      }
    },
    [refreshMe, showLimit],
  );

  const ensureStudio = useCallback(
    async (opts?: EnsureOpts): Promise<boolean> => {
      try {
        const data = await refreshMe();
        if (morphAccessBlocked(data)) {
          if (!opts?.silent) showLimit("access", data);
          return false;
        }
        if (!morphStudioUsageBlocked(data.usage)) return true;
        if (!opts?.silent) showLimit("studio", data);
        return false;
      } catch {
        return true;
      }
    },
    [refreshMe, showLimit],
  );

  const ensureChat = useCallback(
    async (opts?: EnsureOpts): Promise<boolean> => {
      try {
        const data = await refreshMe();
        if (data.access?.morph_chat_allowed === false || morphChatTokensBlocked(data.usage)) {
          if (!opts?.silent) showLimit("chat", data);
          return false;
        }
        return true;
      } catch {
        return true;
      }
    },
    [refreshMe, showLimit],
  );

  const ensureVoice = useCallback(
    async (opts?: EnsureOpts): Promise<boolean> => {
      try {
        const data = await refreshMe();
        const voiceAllowed =
          data.access?.morph_voice_allowed === true || data.has_active === true;
        if (!voiceAllowed) {
          if (!opts?.silent) showLimit("voice", data);
          return false;
        }
        if (morphChatTokensBlocked(data.usage)) {
          if (!opts?.silent) showLimit("chat", data);
          return false;
        }
        return true;
      } catch {
        return true;
      }
    },
    [refreshMe, showLimit],
  );

  const openFromApiLimit = useCallback(
    async (limitKind: MorphLimitKind) => {
      try {
        const data = await refreshMe();
        const kindToShow =
          limitKind === "voice" || limitKind === "chat" || limitKind === "access"
            ? limitKind
            : morphAccessBlocked(data)
              ? "access"
              : limitKind;
        showLimit(kindToShow, data);
      } catch {
        setKind(limitKind);
        setMe(null);
        setOpen(true);
      }
    },
    [refreshMe, showLimit],
  );

  return {
    open,
    setOpen,
    kind,
    me,
    ensureAccess,
    ensureTryOn,
    ensureStudio,
    ensureChat,
    ensureVoice,
    openFromApiLimit,
    invalidateUsage: () => void qc.invalidateQueries({ queryKey: ["subscriptions", "me"] }),
  };
}
