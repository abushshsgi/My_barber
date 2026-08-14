import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  formatMorphUserError,
  MorphPlanLimitError,
  sendMorphChatMessage,
  type MorphChatContext,
  type MorphChatLimits,
  type MorphChatMessage,
} from "../api/ai";
import { useMorphSession } from "../lib/morph-session";

const STORAGE_KEY = "morph_chat_history_v1";

export const MORPH_QUICK_PROMPT_IDS = [
  "face_shape",
  "style_pick",
  "care_routine",
  "product_tips",
  "barber_visit",
] as const;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildContextFromSession(session: ReturnType<typeof useMorphSession>): MorphChatContext | undefined {
  const analyze = session.analyze;
  if (!analyze && !session.preferredStyleTitle) return undefined;
  return {
    face_shape: analyze?.face_shape,
    hair_type: analyze?.hair_type,
    hair_texture: analyze?.hair_texture,
    hair_color: analyze?.hair_color,
    beard: analyze?.beard,
    detected_gender: analyze?.detected_gender,
    summary_uz: analyze?.summary_uz,
    preferred_style_title: session.preferredStyleTitle ?? session.tryOnTitle ?? undefined,
    preferred_style_id: session.preferredStyleId ?? session.tryOnStyleId ?? undefined,
    suggestions: analyze?.suggestions?.slice(0, 3).map((s) => ({
      id: s.id,
      title: s.title,
    })),
  };
}

export function useMorphChat() {
  const { t, i18n } = useTranslation();
  const session = useMorphSession();
  const welcome = useMemo(
    (): MorphChatMessage => ({
      id: "welcome",
      role: "assistant",
      content: t("chat.welcome"),
    }),
    [t, i18n.language],
  );
  const quickPrompts = useMemo(
    () =>
      MORPH_QUICK_PROMPT_IDS.map((id) => ({
        id,
        label: t(`chat.quick.${id === "face_shape" ? "faceShape" : id === "style_pick" ? "stylePick" : id === "care_routine" ? "careRoutine" : id === "product_tips" ? "productTips" : "barberVisit"}`),
      })),
    [t, i18n.language],
  );

  const [messages, setMessages] = useState<MorphChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<MorphChatLimits | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const context = useMemo(() => buildContextFromSession(session), [session]);

  useEffect(() => {
    setMessages((prev) => {
      const rest = prev.filter((m) => m.id !== "welcome");
      return [welcome, ...rest];
    });
  }, [welcome]);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as MorphChatMessage[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages([welcome, ...parsed.filter((m) => m.id !== "welcome")]);
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [welcome]);

  useEffect(() => {
    if (!hydrated) return;
    const persist = messages.filter((m) => m.id !== "welcome").slice(-30);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
  }, [messages, hydrated]);

  const promptText = useCallback(
    (id: (typeof MORPH_QUICK_PROMPT_IDS)[number]) => {
      const key =
        id === "face_shape"
          ? "faceShape"
          : id === "style_pick"
            ? "stylePick"
            : id === "care_routine"
              ? "careRoutine"
              : id === "product_tips"
                ? "productTips"
                : "barberVisit";
      return t(`chat.prompts.${key}`);
    },
    [t],
  );

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMsg: MorphChatMessage = {
        id: newId(),
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSending(true);
      setError(null);

      const history = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await sendMorphChatMessage({
          message: trimmed,
          history,
          context,
        });
        setLimits(res.limits);
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: res.reply,
          },
        ]);
      } catch (err) {
        const msg =
          err instanceof MorphPlanLimitError
            ? err.message
            : formatMorphUserError(
                err instanceof Error ? err.message : "",
                t("chat.error"),
              );
        setError(msg);
      } finally {
        setSending(false);
      }
    },
    [context, messages, sending, t],
  );

  const sendQuickPrompt = useCallback(
    (id: (typeof MORPH_QUICK_PROMPT_IDS)[number]) => {
      void sendText(promptText(id));
    },
    [promptText, sendText],
  );

  const clearChat = useCallback(() => {
    setMessages([welcome]);
    setError(null);
    void AsyncStorage.removeItem(STORAGE_KEY);
  }, [welcome]);

  return {
    messages,
    input,
    setInput,
    sending,
    error,
    limits,
    context,
    quickPrompts,
    sendText,
    sendQuickPrompt,
    clearChat,
    hasContext: Boolean(context),
  };
}
