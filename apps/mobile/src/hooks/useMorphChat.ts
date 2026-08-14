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

const MESSAGES_KEY = "morph_chat_history_v1";
const THREADS_KEY = "morph_chat_threads_v2";
const ACTIVE_KEY = "morph_chat_active_v2";
const WELCOME_KEY = "morph_chat_welcome_seen_v1";

export const MORPH_QUICK_PROMPT_IDS = [
  "face_shape",
  "style_pick",
  "care_routine",
  "product_tips",
  "barber_visit",
] as const;

export type MorphChatThread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: MorphChatMessage[];
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleFromMessages(messages: MorphChatMessage[], fallback: string): string {
  const firstUser = messages.find((m) => m.role === "user" && m.id !== "welcome");
  const raw = (firstUser?.content || "").trim().replace(/\s+/g, " ");
  if (!raw) return fallback;
  return raw.length > 42 ? `${raw.slice(0, 42)}…` : raw;
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
        label: t(
          `chat.quick.${
            id === "face_shape"
              ? "faceShape"
              : id === "style_pick"
                ? "stylePick"
                : id === "care_routine"
                  ? "careRoutine"
                  : id === "product_tips"
                    ? "productTips"
                    : "barberVisit"
          }`,
        ),
      })),
    [t, i18n.language],
  );

  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);
  const [threads, setThreads] = useState<MorphChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
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
    void (async () => {
      try {
        const [seenRaw, threadsRaw, activeRaw, legacyRaw] = await Promise.all([
          AsyncStorage.getItem(WELCOME_KEY),
          AsyncStorage.getItem(THREADS_KEY),
          AsyncStorage.getItem(ACTIVE_KEY),
          AsyncStorage.getItem(MESSAGES_KEY),
        ]);

        if (cancelled) return;

        setWelcomeSeen(seenRaw === "1");

        let parsedThreads: MorphChatThread[] = [];
        if (threadsRaw) {
          try {
            const rows = JSON.parse(threadsRaw) as MorphChatThread[];
            if (Array.isArray(rows)) parsedThreads = rows;
          } catch {
            /* ignore */
          }
        }

        // Legacy single-thread → migrate
        if (!parsedThreads.length && legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw) as MorphChatMessage[];
            if (Array.isArray(legacy) && legacy.length) {
              const cleaned = legacy.filter((m) => m.id !== "welcome");
              if (cleaned.length) {
                const id = newId();
                parsedThreads = [
                  {
                    id,
                    title: titleFromMessages(cleaned, t("chat.history.untitled")),
                    updatedAt: new Date().toISOString(),
                    messages: cleaned,
                  },
                ];
                await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(parsedThreads));
                await AsyncStorage.setItem(ACTIVE_KEY, id);
              }
            }
          } catch {
            /* ignore */
          }
        }

        setThreads(parsedThreads);
        const active =
          (activeRaw && parsedThreads.some((th) => th.id === activeRaw) && activeRaw) ||
          parsedThreads[0]?.id ||
          null;
        setActiveThreadId(active);
        if (active) {
          const found = parsedThreads.find((th) => th.id === active);
          if (found?.messages?.length) {
            setMessages([welcome, ...found.messages.filter((m) => m.id !== "welcome")]);
          }
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, welcome]);

  const persistThreads = useCallback(async (next: MorphChatThread[], activeId: string | null) => {
    setThreads(next);
    setActiveThreadId(activeId);
    await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(next.slice(0, 40)));
    if (activeId) await AsyncStorage.setItem(ACTIVE_KEY, activeId);
    else await AsyncStorage.removeItem(ACTIVE_KEY);
  }, []);

  const syncActiveThread = useCallback(
    (nextMessages: MorphChatMessage[]) => {
      const cleaned = nextMessages.filter((m) => m.id !== "welcome");
      // Bo'sh suhbatni history ga yozmaymiz — faqat real xabar bo'lsa.
      if (!cleaned.length && !activeThreadId) return;

      const now = new Date().toISOString();
      setThreads((prev) => {
        let next: MorphChatThread[];
        let activeId = activeThreadId;
        if (!activeId) {
          if (!cleaned.length) return prev;
          activeId = newId();
          next = [
            {
              id: activeId,
              title: titleFromMessages(cleaned, t("chat.history.untitled")),
              updatedAt: now,
              messages: cleaned,
            },
            ...prev,
          ];
          setActiveThreadId(activeId);
        } else {
          const exists = prev.some((th) => th.id === activeId);
          if (!exists) {
            next = [
              {
                id: activeId,
                title: titleFromMessages(cleaned, t("chat.history.untitled")),
                updatedAt: now,
                messages: cleaned,
              },
              ...prev,
            ];
          } else {
            next = prev.map((th) =>
              th.id === activeId
                ? {
                    ...th,
                    title: titleFromMessages(cleaned, th.title || t("chat.history.untitled")),
                    updatedAt: now,
                    messages: cleaned,
                  }
                : th,
            );
          }
        }
        void AsyncStorage.setItem(THREADS_KEY, JSON.stringify(next.slice(0, 40)));
        if (activeId) void AsyncStorage.setItem(ACTIVE_KEY, activeId);
        return next;
      });
    },
    [activeThreadId, t],
  );

  useEffect(() => {
    if (!hydrated) return;
    syncActiveThread(messages);
  }, [messages, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (err instanceof MorphPlanLimitError) {
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
          setInput(trimmed);
          setError(null);
          return "limit" as const;
        }
        const msg =
          formatMorphUserError(
            err instanceof Error ? err.message : "",
            t("chat.error"),
          );
        setError(msg);
        return "error" as const;
      } finally {
        setSending(false);
      }
      return "ok" as const;
    },
    [context, messages, sending, t],
  );

  const sendQuickPrompt = useCallback(
    (id: (typeof MORPH_QUICK_PROMPT_IDS)[number]) => sendText(promptText(id)),
    [promptText, sendText],
  );

  const markWelcomeSeen = useCallback(async () => {
    setWelcomeSeen(true);
    await AsyncStorage.setItem(WELCOME_KEY, "1");
  }, []);

  const startNewChat = useCallback(() => {
    const id = newId();
    const thread: MorphChatThread = {
      id,
      title: t("chat.history.newChat"),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    const next = [thread, ...threads];
    void persistThreads(next, id);
    setMessages([welcome]);
    setError(null);
    setInput("");
  }, [persistThreads, t, threads, welcome]);

  const openThread = useCallback(
    (id: string) => {
      const found = threads.find((th) => th.id === id);
      if (!found) return;
      setActiveThreadId(id);
      void AsyncStorage.setItem(ACTIVE_KEY, id);
      setMessages([welcome, ...found.messages.filter((m) => m.id !== "welcome")]);
      setError(null);
      setInput("");
    },
    [threads, welcome],
  );

  const deleteThread = useCallback(
    (id: string) => {
      const next = threads.filter((th) => th.id !== id);
      const nextActive =
        activeThreadId === id ? next[0]?.id ?? null : activeThreadId;
      void persistThreads(next, nextActive);
      if (activeThreadId === id) {
        const found = next.find((th) => th.id === nextActive);
        setMessages([welcome, ...(found?.messages.filter((m) => m.id !== "welcome") ?? [])]);
      }
    },
    [activeThreadId, persistThreads, threads, welcome],
  );

  const clearChat = useCallback(() => {
    setMessages([welcome]);
    setError(null);
    if (activeThreadId) {
      setThreads((prev) => {
        const next = prev.map((th) =>
          th.id === activeThreadId
            ? { ...th, messages: [], updatedAt: new Date().toISOString(), title: t("chat.history.newChat") }
            : th,
        );
        void AsyncStorage.setItem(THREADS_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [activeThreadId, t, welcome]);

  return {
    welcomeSeen,
    markWelcomeSeen,
    hydrated,
    messages,
    input,
    setInput,
    sending,
    error,
    limits,
    context,
    quickPrompts,
    threads,
    activeThreadId,
    sendText,
    sendQuickPrompt,
    clearChat,
    startNewChat,
    openThread,
    deleteThread,
    hasContext: Boolean(context),
  };
}
