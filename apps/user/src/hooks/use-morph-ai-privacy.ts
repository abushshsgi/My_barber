import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMorphAiPrivacyData,
  fetchMorphAiPrivacy,
  patchMorphAiPrivacy,
  type MorphAiPrivacyPrefs,
} from "@/lib/api/ai";
import { authQueryEnabled } from "@/lib/auth-query";
import { hasValidUserSession } from "@/lib/api/client";
import { patchMorphAiPrefs, readMorphAiPrefs } from "@/lib/morph-ai-prefs";

export const morphAiPrivacyQueryKey = ["morph-ai", "privacy"] as const;

export function useMorphAiPrivacy() {
  const qc = useQueryClient();
  const loggedIn = hasValidUserSession();

  const query = useQuery({
    queryKey: morphAiPrivacyQueryKey,
    queryFn: fetchMorphAiPrivacy,
    enabled: authQueryEnabled(loggedIn),
    staleTime: 30_000,
  });

  const patch = useMutation({
    mutationFn: (next: Partial<MorphAiPrivacyPrefs>) => patchMorphAiPrivacy(next),
    onSuccess: (data) => {
      qc.setQueryData(morphAiPrivacyQueryKey, data);
      patchMorphAiPrefs({
        privacyLocalOnly: data.prefs.privacy_local_only,
        saveHistory: data.prefs.save_chat_history,
        persistLooks: data.prefs.persist_looks,
        limitNotify: data.prefs.limit_notify,
        useTryOnContext: data.prefs.use_tryon_context,
      });
    },
  });

  const wipe = useMutation({
    mutationFn: (kind: "chats" | "looks" | "selfies" | "shares" | "all") =>
      deleteMorphAiPrivacyData(kind),
    onSuccess: (data) => {
      qc.setQueryData(morphAiPrivacyQueryKey, data);
    },
  });

  const local = readMorphAiPrefs();

  return {
    loggedIn,
    query,
    patch,
    wipe,
    local,
  };
}
