import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  formatMorphUserError,
  MorphPlanLimitError,
  clearMorphChatThreads,
  deleteMorphChatThread,
  fetchMorphChatLimits,
  fetchMorphChatThreads,
  sendMorphChatMessage,
  streamMorphChatMessage,
  syncMorphChatThread,
  type MorphChatContext,
  type MorphChatLimits,
  type MorphChatMessage,
  type MorphChatThreadRemote,
} from "../api/ai";
import { createPacedWriter } from "../lib/chat-pace";
import {
  DEFAULT_MORPH_CHAT_PREFS,
  readMorphChatPrefs,
  shouldPersistChatToServer,
  writeMorphChatLimitsSnapshot,
  type MorphChatPrefs,
} from "../lib/morph-chat-prefs";
import { useMorphSession } from "../lib/morph-session";
import { currentLang } from "../i18n/config";

const MESSAGES_KEY = "morph_chat_history_v1";
const THREADS_KEY = "morph_chat_threads_v3";
const LEGACY_THREADS_KEY = "morph_chat_threads_v2";
const ACTIVE_KEY = "morph_chat_active_v3";
const WELCOME_KEY = "morph_chat_welcome_seen_v1";

export const MORPH_QUICK_PROMPT_IDS = [
  "face_shape",
  "style_pick",
  "beard_style",
  "care_routine",
  "product_tips",
  "barber_visit",
] as const;

const QUICK_I18N: Record<(typeof MORPH_QUICK_PROMPT_IDS)[number], string> = {
  face_shape: "faceShape",
  style_pick: "stylePick",
  beard_style: "beardStyle",
  care_routine: "careRoutine",
  product_tips: "productTips",
  barber_visit: "barberVisit",
};

export type MorphChatThread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: MorphChatMessage[];
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function realMessages(messages: MorphChatMessage[]): MorphChatMessage[] {
  return messages.filter(
    (m) => m.id !== "welcome" && (m.streaming || m.content.trim().length > 0),
  );
}

function persistable(messages: MorphChatMessage[]): MorphChatMessage[] {
  return realMessages(messages)
    .filter((m) => m.content.trim().length > 0)
    .map(({ streaming: _ignored, ...rest }) => rest);
}

function titleFromMessages(messages: MorphChatMessage[], fallback: string): string {
  const firstUser = realMessages(messages).find((m) => m.role === "user");
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

function sanitizeThread(thread: MorphChatThread): MorphChatThread | null {
  const messages = realMessages(thread.messages ?? []);
  if (!messages.length) return null;
  return { ...thread, messages };
}

function remoteToLocal(row: MorphChatThreadRemote): MorphChatThread | null {
  const messages = (row.messages ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({
      id: String(m.id || newId()),
      role: m.role,
      content: String(m.content || ""),
    }));
  if (!messages.length && !(row.preview || row.title)) return null;
  return {
    id: String(row.id),
    title: (row.title || row.preview || "").trim() || "Suhbat",
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    messages: messages.length
      ? messages
      : row.preview
        ? [{ id: newId(), role: "user", content: String(row.preview) }]
        : [],
  };
}

function mergeThreads(local: MorphChatThread[], remote: MorphChatThread[]): MorphChatThread[] {
  const map = new Map<string, MorphChatThread>();
  for (const th of local) {
    const clean = sanitizeThread(th);
    if (clean) map.set(clean.id, clean);
  }
  for (const th of remote) {
    const clean = sanitizeThread(th);
    if (!clean) continue;
    const prev = map.get(clean.id);
    if (!prev) {
      map.set(clean.id, clean);
      continue;
    }
    const prevTs = Date.parse(prev.updatedAt) || 0;
    const nextTs = Date.parse(clean.updatedAt) || 0;
    const preferRemote =
      nextTs >= prevTs || clean.messages.length >= prev.messages.length;
    map.set(clean.id, preferRemote ? clean : prev);
  }
  return [...map.values()]
    .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0))
    .slice(0, 40);
}

export function useMorphChat() {
  const { t, i18n } = useTranslation();
  const session = useMorphSession();

  const quickPrompts = useMemo(
    () =>
      MORPH_QUICK_PROMPT_IDS.map((id) => ({
        id,
        label: t(`chat.quick.${QUICK_I18N[id]}`),
      })),
    [t, i18n.language],
  );

  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);
  const [threads, setThreads] = useState<MorphChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MorphChatMessage[]>([]);
  const [input, setInput] = useState("");
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<MorphChatLimits | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const activeThreadIdRef = useRef<string | null>(null);
  const messagesRef = useRef<MorphChatMessage[]>([]);
  const threadsRef = useRef<MorphChatThread[]>([]);
  const prefsRef = useRef<MorphChatPrefs>({ ...DEFAULT_MORPH_CHAT_PREFS });
  const untitled = t("chat.history.untitled");
  const lastReplyRef = useRef("");
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const context = useMemo(() => buildContextFromSession(session), [session]);

  useEffect(() => {
    void readMorphChatPrefs().then((p) => {
      prefsRef.current = p;
    });
  }, []);

  const persistThreads = useCallback(async (next: MorphChatThread[], activeId: string | null) => {
    const cleaned = next
      .map(sanitizeThread)
      .filter((th): th is MorphChatThread => Boolean(th))
      .slice(0, 40);
    setThreads(cleaned);
    threadsRef.current = cleaned;
    setActiveThreadId(activeId);
    activeThreadIdRef.current = activeId;
    if (prefsRef.current.saveHistory) {
      await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(cleaned));
      if (activeId) await AsyncStorage.setItem(ACTIVE_KEY, activeId);
      else await AsyncStorage.removeItem(ACTIVE_KEY);
    } else {
      await AsyncStorage.multiRemove([THREADS_KEY, ACTIVE_KEY, LEGACY_THREADS_KEY, MESSAGES_KEY]);
    }
  }, []);

  const writeThreadMessages = useCallback(
    (threadId: string, nextMessages: MorphChatMessage[]) => {
      const cleaned = persistable(nextMessages);
      const now = new Date().toISOString();
      const prev = threadsRef.current;
      const exists = prev.some((th) => th.id === threadId);
      let next: MorphChatThread[];
      if (!cleaned.length) {
        next = prev.filter((th) => th.id !== threadId);
      } else if (!exists) {
        next = [
          {
            id: threadId,
            title: titleFromMessages(cleaned, untitled),
            updatedAt: now,
            messages: cleaned,
          },
          ...prev,
        ];
      } else {
        next = prev.map((th) =>
          th.id === threadId
            ? {
                ...th,
                title: titleFromMessages(cleaned, th.title || untitled),
                updatedAt: now,
                messages: cleaned,
              }
            : th,
        );
      }
      threadsRef.current = next;
      setThreads(next);
      if (prefsRef.current.saveHistory) {
        void AsyncStorage.setItem(THREADS_KEY, JSON.stringify(next.slice(0, 40)));
        void AsyncStorage.setItem(ACTIVE_KEY, threadId);
      }
    },
    [untitled],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const prefs = await readMorphChatPrefs();
        if (!cancelled) prefsRef.current = prefs;

        const [seenRaw, threadsRaw, legacyRaw, oldSingle] = await Promise.all([
          AsyncStorage.getItem(WELCOME_KEY),
          AsyncStorage.getItem(THREADS_KEY),
          AsyncStorage.getItem(LEGACY_THREADS_KEY),
          AsyncStorage.getItem(MESSAGES_KEY),
        ]);

        if (cancelled) return;
        setWelcomeSeen(seenRaw === "1");

        let parsedThreads: MorphChatThread[] = [];
        const raw = threadsRaw || legacyRaw;
        if (raw) {
          try {
            const rows = JSON.parse(raw) as MorphChatThread[];
            if (Array.isArray(rows)) {
              parsedThreads = rows
                .map(sanitizeThread)
                .filter((th): th is MorphChatThread => Boolean(th));
            }
          } catch {
            /* ignore */
          }
        }

        if (!parsedThreads.length && oldSingle) {
          try {
            const legacy = JSON.parse(oldSingle) as MorphChatMessage[];
            const cleaned = Array.isArray(legacy) ? realMessages(legacy) : [];
            if (cleaned.length) {
              parsedThreads = [
                {
                  id: newId(),
                  title: titleFromMessages(cleaned, t("chat.history.untitled")),
                  updatedAt: new Date().toISOString(),
                  messages: cleaned,
                },
              ];
            }
          } catch {
            /* ignore */
          }
        }

        if (shouldPersistChatToServer(prefs)) {
          try {
            const remoteRows = await fetchMorphChatThreads({ messages: true });
            const remoteLocal = remoteRows
              .map(remoteToLocal)
              .filter((th): th is MorphChatThread => Boolean(th));
            parsedThreads = mergeThreads(parsedThreads, remoteLocal);

            // Local-only threads (eski) — bir marta DB ga ko‘chirish
            for (const th of parsedThreads) {
              const onServer = remoteLocal.some((r) => r.id === th.id);
              if (!onServer && th.messages.length) {
                void syncMorphChatThread({
                  id: th.id,
                  title: th.title,
                  messages: th.messages,
                  updated_at: th.updatedAt,
                }).catch(() => undefined);
              }
            }
          } catch {
            /* offline / auth — local qoladi */
          }
        }

        try {
          const remoteLimits = await fetchMorphChatLimits();
          if (!cancelled) {
            setLimits(remoteLimits);
            void writeMorphChatLimitsSnapshot(remoteLimits);
            if (
              prefs.limitNotify &&
              typeof remoteLimits.daily_remaining === "number" &&
              remoteLimits.daily_remaining <= 3
            ) {
              setLimitWarning(
                t("chat.settings.limitWarn", {
                  remaining: remoteLimits.daily_remaining,
                  limit: remoteLimits.daily_limit,
                }),
              );
            }
          }
        } catch {
          /* offline */
        }

        setThreads(parsedThreads);
        threadsRef.current = parsedThreads;
        if (prefs.saveHistory && parsedThreads.length) {
          await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(parsedThreads.slice(0, 40)));
        }
        await AsyncStorage.removeItem(ACTIVE_KEY);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const promptText = useCallback(
    (id: (typeof MORPH_QUICK_PROMPT_IDS)[number]) => t(`chat.prompts.${QUICK_I18N[id]}`),
    [t],
  );

  const sendText = useCallback(
    async (text: string, options?: { voice?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || sendingRef.current) return;
      sendingRef.current = true;

      let threadId = activeThreadIdRef.current;
      if (!threadId) {
        threadId = newId();
        activeThreadIdRef.current = threadId;
        setActiveThreadId(threadId);
      }

      const userMsg: MorphChatMessage = {
        id: newId(),
        role: "user",
        content: trimmed,
      };
      const history = persistable(messagesRef.current).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const nextMessages = [...realMessages(messagesRef.current), userMsg];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      writeThreadMessages(threadId, nextMessages);
      setInput("");
      setSending(true);
      setError(null);

      const assistantMsg: MorphChatMessage = {
        id: newId(),
        role: "assistant",
        content: "",
        streaming: true,
      };
      const withAssistant = [...nextMessages, assistantMsg];
      messagesRef.current = withAssistant;
      setMessages(withAssistant);

      const writer = createPacedWriter((text) => {
        if (activeThreadIdRef.current !== threadId) return;
        const updated = messagesRef.current.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: text, streaming: true } : m,
        );
        messagesRef.current = updated;
        setMessages(updated);
      });

      try {
        const prefs = await readMorphChatPrefs();
        prefsRef.current = prefs;
        const lang =
          prefs.replyLang === "app"
            ? currentLang() === "ru"
              ? "ru"
              : "uz"
            : prefs.replyLang;
        const prefContext: MorphChatContext = {
          ...(prefs.useTryOnContext && context ? context : {}),
          reply_lang: lang,
          reply_style: prefs.replyStyle,
          ...(prefs.adviceGender !== "auto"
            ? { advice_gender: prefs.adviceGender }
            : {}),
          ...(options?.voice ? { voice_mode: true } : {}),
        };
        const historyPayload = prefs.privacyLocalOnly ? [] : history.slice(-16);
        const persist = shouldPersistChatToServer(prefs);

        let finalText = "";
        let resLimits: MorphChatLimits;
        const sendPayload = {
          message: trimmed,
          history: historyPayload,
          context: prefContext,
          thread_id: threadId,
          persist,
        };
        if (prefs.streaming) {
          const res = await streamMorphChatMessage(sendPayload, (chunk) => writer.append(chunk));
          finalText = (await writer.finish()) || res.reply;
          resLimits = res.limits;
        } else {
          writer.cancel();
          const res = await sendMorphChatMessage(sendPayload);
          finalText = res.reply;
          resLimits = res.limits;
          if (activeThreadIdRef.current === threadId) {
            const instant = messagesRef.current.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: finalText, streaming: true }
                : m,
            );
            messagesRef.current = instant;
            setMessages(instant);
          }
        }
        setLimits(resLimits);
        void writeMorphChatLimitsSnapshot(resLimits);
        if (
          prefs.limitNotify &&
          typeof resLimits.daily_remaining === "number" &&
          resLimits.daily_remaining <= 3
        ) {
          setLimitWarning(
            t("chat.settings.limitWarn", {
              remaining: resLimits.daily_remaining,
              limit: resLimits.daily_limit,
            }),
          );
        } else {
          setLimitWarning(null);
        }
        const doneMsg: MorphChatMessage = {
          id: assistantMsg.id,
          role: "assistant",
          content: finalText,
        };
        lastReplyRef.current = finalText;
        if (activeThreadIdRef.current === threadId) {
          const withReply = persistable(
            messagesRef.current.map((m) => (m.id === assistantMsg.id ? doneMsg : m)),
          );
          messagesRef.current = withReply;
          setMessages(withReply);
          writeThreadMessages(threadId, withReply);
        } else {
          const stored = threadsRef.current.find((th) => th.id === threadId);
          writeThreadMessages(threadId, [...(stored?.messages ?? nextMessages), doneMsg]);
        }
      } catch (err) {
        writer.cancel();
        if (err instanceof MorphPlanLimitError) {
          if (activeThreadIdRef.current === threadId) {
            const rolled = persistable(messagesRef.current).filter(
              (m) => m.id !== userMsg.id && m.id !== assistantMsg.id,
            );
            messagesRef.current = rolled;
            setMessages(rolled);
            writeThreadMessages(threadId, rolled);
          }
          setInput(trimmed);
          setError(null);
          return "limit" as const;
        }
        if (activeThreadIdRef.current === threadId) {
          const rolled = persistable(messagesRef.current).filter((m) => m.id !== assistantMsg.id);
          messagesRef.current = rolled;
          setMessages(rolled);
        }
        const msg = formatMorphUserError(
          err instanceof Error ? err.message : "",
          t("chat.error"),
        );
        setError(msg);
        return "error" as const;
      } finally {
        writer.cancel();
        setSending(false);
        sendingRef.current = false;
      }
      return "ok" as const;
    },
    [context, t, writeThreadMessages],
  );

  const sendQuickPrompt = useCallback(
    (id: (typeof MORPH_QUICK_PROMPT_IDS)[number]) => sendText(promptText(id)),
    [promptText, sendText],
  );

  const retryLast = useCallback(async () => {
    if (sendingRef.current) return;
    setError(null);
    const lastUser = persistable(messagesRef.current).filter((m) => m.role === "user").slice(-1)[0];
    if (!lastUser?.content) return;
    const without = persistable(messagesRef.current).filter((m) => m.id !== lastUser.id);
    messagesRef.current = without;
    setMessages(without);
    const threadId = activeThreadIdRef.current;
    if (threadId) writeThreadMessages(threadId, without);
    return sendText(lastUser.content);
  }, [sendText, writeThreadMessages]);

  const markWelcomeSeen = useCallback(async () => {
    setWelcomeSeen(true);
    await AsyncStorage.setItem(WELCOME_KEY, "1");
  }, []);

  const startNewChat = useCallback(() => {
    activeThreadIdRef.current = null;
    messagesRef.current = [];
    setActiveThreadId(null);
    setMessages([]);
    setError(null);
    setInput("");
    void AsyncStorage.removeItem(ACTIVE_KEY);
  }, []);

  const openThread = useCallback((id: string) => {
    const found = threadsRef.current.find((th) => th.id === id);
    if (!found) return;
    const cleaned = realMessages(found.messages);
    activeThreadIdRef.current = id;
    messagesRef.current = cleaned;
    setActiveThreadId(id);
    setMessages(cleaned);
    setError(null);
    setInput("");
    void AsyncStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      const next = threadsRef.current.filter((th) => th.id !== id);
      const switching = activeThreadIdRef.current === id;
      void persistThreads(next, switching ? null : activeThreadIdRef.current);
      if (switching) {
        messagesRef.current = [];
        setMessages([]);
        setError(null);
        setInput("");
      }
      void deleteMorphChatThread(id).catch(() => undefined);
    },
    [persistThreads],
  );

  const clearChat = useCallback(() => {
    startNewChat();
  }, [startNewChat]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearAllChats = useCallback(async () => {
    activeThreadIdRef.current = null;
    messagesRef.current = [];
    threadsRef.current = [];
    setActiveThreadId(null);
    setMessages([]);
    setThreads([]);
    setError(null);
    setInput("");
    await AsyncStorage.multiRemove([
      THREADS_KEY,
      ACTIVE_KEY,
      LEGACY_THREADS_KEY,
      MESSAGES_KEY,
    ]);
    void clearMorphChatThreads().catch(() => undefined);
  }, []);

  const reloadPrefs = useCallback(async () => {
    prefsRef.current = await readMorphChatPrefs();
  }, []);

  const visibleThreads = useMemo(
    () => threads.filter((th) => realMessages(th.messages).length > 0),
    [threads],
  );

  return {
    welcomeSeen,
    markWelcomeSeen,
    hydrated,
    messages: realMessages(messages),
    input,
    setInput,
    sending,
    error,
    limits,
    limitWarning,
    clearLimitWarning: () => setLimitWarning(null),
    context,
    quickPrompts,
    threads: visibleThreads,
    activeThreadId,
    sendText,
    lastReply: () => lastReplyRef.current,
    sendQuickPrompt,
    retryLast,
    clearChat,
    clearError,
    clearAllChats,
    reloadPrefs,
    startNewChat,
    openThread,
    deleteThread,
    hasContext: Boolean(context),
  };
}
