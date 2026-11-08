import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ChevronLeft,
  Loader2,
  Lock,
  Menu,
  Mic,
  Plus,
  Send,
  Settings2,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { navigateBack } from "@/lib/mobile-back";
import { MorphLimitUpsell } from "@/components/ai-style/MorphLimitUpsell";
import { MorphToggle } from "@/components/ai-style/MorphToggle";
import { Button } from "@/components/ui/button";
import { useMorphAiPrivacy } from "@/hooks/use-morf-ai-privacy";
import { useMorphLimitGate } from "@/hooks/use-morph-limit-gate";
import { hasValidUserSession } from "@/lib/api/client";
import {
  fetchMorphChatThreads,
  sendMorphChatMessage,
  streamMorphChatMessage,
  type ChatContentBlock,
  type ChatHairstyleCard,
  type MorphChatLimits,
  type MorphChatThreadRemote,
} from "@/lib/api/ai";
import { ChatContentBlocks } from "@/components/ai-style/ChatContentBlocks";
import type { ChatHairAnswers } from "@/components/ai-style/ChatHairQuiz";
import { MorphChatAppView } from "@/components/ai-style/MorphChatAppView";
import { cardsFromBlocks, historyStyleRefs, visualBlocks } from "@/lib/chat-blocks";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";
import { useHairCareProfile } from "@/hooks/use-hair-care-profile";
import {
  patchMorphAiPrefs,
  readMorphAiPrefs,
  shouldPersistChatToServer,
} from "@/lib/morf-ai-prefs";
import { isMorphPlanLimitError, MorphHairProfileRequiredError } from "@/lib/morph-plan-limit";
import { cn } from "@/lib/utils";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  hairstyles?: ChatHairstyleCard[];
  blocks?: ChatContentBlock[];
};

type ChatThread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMsg[];
};

const THREADS_KEY = "mysaloon.morphAi.chat.threads.v2";
const LEGACY_THREADS_KEY = "mysaloon.morphAi.chat.threads.v1";
const ACTIVE_KEY = "mysaloon.morphAi.chat.activeId";
const SESSION_THREAD_KEY = "mysaloon.morphAi.chat.threadId";
const MAX_THREADS = 40;

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function keepMessage(message: ChatMsg) {
  return Boolean(message.content?.trim() || message.blocks?.length || message.hairstyles?.length);
}

function titleFromMessages(messages: ChatMsg[], fallback: string) {
  const first = messages.find((message) => message.role === "user" && message.content.trim());
  const raw = (first?.content || "").trim().replace(/\s+/g, " ");
  if (!raw) return fallback;
  return raw.length > 42 ? `${raw.slice(0, 42)}…` : raw;
}

function threadFromRemote(row: MorphChatThreadRemote, fallbackTitle: string): ChatThread | null {
  const messages = (row.messages ?? []).flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    const hairstyles = Array.isArray(message.hairstyles)
      ? message.hairstyles
      : Array.isArray(message.context?.hairstyles)
        ? message.context.hairstyles
        : undefined;
    const blocks = Array.isArray(message.blocks)
      ? message.blocks
      : Array.isArray(message.context?.blocks)
        ? message.context.blocks
        : undefined;
    const next: ChatMsg = {
      id: String(message.id || newId()),
      role: message.role,
      content: String(message.content || ""),
      ...(hairstyles?.length ? { hairstyles } : {}),
      ...(blocks?.length ? { blocks } : {}),
    };
    return keepMessage(next) ? [next] : [];
  });
  if (!messages.length || !row.id) return null;
  return {
    id: String(row.id),
    title: (row.title || "").trim() || titleFromMessages(messages, fallbackTitle),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    messages,
  };
}

function loadLocalThreads(fallbackTitle: string): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatThread[];
      if (Array.isArray(parsed)) {
        return parsed.flatMap((thread) => {
          const messages = Array.isArray(thread.messages) ? thread.messages.filter(keepMessage) : [];
          if (!thread?.id || !messages.length) return [];
          return [
            {
              id: String(thread.id),
              title: thread.title || titleFromMessages(messages, fallbackTitle),
              updatedAt: thread.updatedAt || new Date().toISOString(),
              messages,
            },
          ];
        });
      }
    }
  } catch {
    /* ignore broken cache */
  }

  try {
    const legacy = localStorage.getItem(LEGACY_THREADS_KEY);
    if (!legacy) return [];
    const parsed = JSON.parse(legacy) as ChatMsg[];
    const messages = Array.isArray(parsed) ? parsed.filter(keepMessage) : [];
    if (!messages.length) return [];
    const id =
      sessionStorage.getItem(SESSION_THREAD_KEY) || localStorage.getItem(ACTIVE_KEY) || newId();
    return [
      {
        id,
        title: titleFromMessages(messages, fallbackTitle),
        updatedAt: new Date().toISOString(),
        messages,
      },
    ];
  } catch {
    return [];
  }
}

function saveLocalThreads(threads: ChatThread[]) {
  if (typeof window === "undefined") return;
  const prefs = readMorphAiPrefs();
  if (!prefs.saveHistory) {
    localStorage.removeItem(THREADS_KEY);
    localStorage.removeItem(LEGACY_THREADS_KEY);
    return;
  }
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads.slice(0, MAX_THREADS)));
}

function readActiveId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACTIVE_KEY) || sessionStorage.getItem(SESSION_THREAD_KEY) || "";
}

function rememberActiveId(id: string) {
  if (typeof window === "undefined" || !id) return;
  localStorage.setItem(ACTIVE_KEY, id);
  sessionStorage.setItem(SESSION_THREAD_KEY, id);
}

function styleCount(thread: ChatThread) {
  return thread.messages.reduce((sum, message) => {
    const cards = message.hairstyles?.length ? message.hairstyles : cardsFromBlocks(message.blocks);
    return sum + cards.length;
  }, 0);
}

function mergeThreads(local: ChatThread[], remote: ChatThread[]) {
  const map = new Map<string, ChatThread>();
  for (const thread of local) map.set(thread.id, thread);
  for (const thread of remote) {
    const prev = map.get(thread.id);
    if (!prev) {
      map.set(thread.id, thread);
      continue;
    }
    const remoteRicher =
      thread.messages.length > prev.messages.length ||
      (thread.messages.length === prev.messages.length && styleCount(thread) > styleCount(prev)) ||
      (thread.messages.length === prev.messages.length &&
        styleCount(thread) === styleCount(prev) &&
        (Date.parse(thread.updatedAt) || 0) >= (Date.parse(prev.updatedAt) || 0));
    map.set(thread.id, remoteRicher ? thread : prev);
  }
  return [...map.values()]
    .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0))
    .slice(0, MAX_THREADS);
}

function upsertThread(threads: ChatThread[], id: string, messages: ChatMsg[], fallbackTitle: string) {
  const cleaned = messages.filter(keepMessage).slice(-80);
  const rest = threads.filter((thread) => thread.id !== id);
  if (!id || !cleaned.length) return rest;
  return [
    {
      id,
      title: titleFromMessages(cleaned, fallbackTitle),
      updatedAt: new Date().toISOString(),
      messages: cleaned,
    },
    ...rest,
  ].slice(0, MAX_THREADS);
}

function firstStyleImage(thread: ChatThread) {
  for (const message of thread.messages) {
    const cards = message.hairstyles?.length ? message.hairstyles : cardsFromBlocks(message.blocks);
    const url = cards.find((card) => card.image_url)?.image_url;
    if (url) return getHairstyleImageUrl({ imageUrl: url });
  }
  return "";
}

function chatUsagePct(
  limits:
    | {
        token_used?: number | null;
        daily_used?: number | null;
        token_limit?: number | null;
        daily_limit?: number | null;
      }
    | null
    | undefined,
) {
  const used = limits?.token_used ?? limits?.daily_used;
  const limit = limits?.token_limit ?? limits?.daily_limit;
  if (typeof used !== "number" || typeof limit !== "number" || !limit) return 0;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

export function MorphAiChatPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const loggedIn = hasValidUserSession();
  const hairQ = useHairCareProfile();
  const gate = useMorphLimitGate();
  const privacy = useMorphAiPrivacy();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [liveLimits, setLiveLimits] = useState<MorphChatLimits | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [hairDraft, setHairDraft] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(readMorphAiPrefs);
  const lastFailedRef = useRef("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const activeThreadIdRef = useRef("");
  const booted = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const fallback = t("aiStylePage.chat.untitled");
    const local = loadLocalThreads(fallback);
    const storedActive = readActiveId();
    const active = local.find((thread) => thread.id === storedActive) ?? null;
    const id = active?.id || storedActive || newId();
    activeThreadIdRef.current = id;
    setThreads(local);
    setActiveThreadId(id);
    setMessages(active?.messages ?? []);
    rememberActiveId(id);
    setHydrated(true);

    if (!loggedIn || !shouldPersistChatToServer(readMorphAiPrefs())) return;
    void (async () => {
      try {
        const rows = await fetchMorphChatThreads({ messages: true });
        if (!alive.current) return;
        const remote = rows.flatMap((row) => {
          const thread = threadFromRemote(row, fallback);
          return thread ? [thread] : [];
        });
        const merged = mergeThreads(local, remote);
        setThreads(merged);
        saveLocalThreads(merged);
        const currentId = activeThreadIdRef.current;
        const opened = merged.find((thread) => thread.id === currentId);
        const localActive = local.find((thread) => thread.id === currentId);
        const remoteHasThePhotos =
          opened &&
          (!localActive ||
            opened.messages.length > localActive.messages.length ||
            (opened.messages.length === localActive.messages.length &&
              styleCount(opened) >= styleCount(localActive)));
        if (opened && remoteHasThePhotos) {
          setMessages(opened.messages);
        }
      } catch {
        /* offline — qurilmadagi nusxa qoladi */
      }
    })();
  }, [loggedIn, t]);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (!hydrated || !activeThreadId) return;
    const fallback = t("aiStylePage.chat.untitled");
    setThreads((prev) => {
      const next = upsertThread(prev, activeThreadId, messages, fallback);
      saveLocalThreads(next);
      return next;
    });
    rememberActiveId(activeThreadId);
  }, [hydrated, messages, activeThreadId, t]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const applyLimits = useCallback(
    (limits: MorphChatLimits) => {
      setLiveLimits(limits);
      const prefs = readMorphAiPrefs();
      if (
        prefs.limitNotify &&
        (limits.should_warn ||
          (typeof limits.daily_remaining === "number" &&
            typeof limits.daily_limit === "number" &&
            limits.daily_remaining <= Math.max(500, Math.floor(limits.daily_limit * 0.1))))
      ) {
        setLimitWarning(
          t("aiStylePage.chat.limitWarn", {
            pct: chatUsagePct(limits),
          }),
        );
      } else {
        setLimitWarning(null);
      }
    },
    [t],
  );

  const send = useCallback(
    async (raw?: string, assumeHair?: ChatHairAnswers) => {
      const trimmed = (raw ?? input).trim();
      if (!trimmed || sending) return null;
      if (!loggedIn) {
        void navigate({ to: "/auth" });
        return null;
      }
      const hair = assumeHair ?? (hairQ.data?.complete ? hairQ.data : null);
      if (!hair) {
        if (!raw) setInput("");
        setHairDraft(trimmed);
        setChatOpen(true);
        return null;
      }
      setChatOpen(true);
      setSendError(null);
      const allowed = await gate.ensureChat();
      if (!allowed) return null;

      const prefs = readMorphAiPrefs();
      const userMsg: ChatMsg = { id: newId(), role: "user", content: trimmed };
      const history = prefs.privacyLocalOnly
        ? []
        : messages.slice(-24).map((m) => {
            const styles = historyStyleRefs(m);
            return {
              role: m.role,
              content: m.content,
              ...(styles.length ? { hairstyles: styles } : {}),
            };
          });
      const persist = shouldPersistChatToServer(prefs);
      const threadId = activeThreadIdRef.current || newId();
      if (!activeThreadIdRef.current) {
        activeThreadIdRef.current = threadId;
        setActiveThreadId(threadId);
      }
      const paint = (updater: (prev: ChatMsg[]) => ChatMsg[]) => {
        if (activeThreadIdRef.current === threadId) {
          setMessages(updater);
          return;
        }
        setThreads((prev) => {
          const current = prev.find((thread) => thread.id === threadId);
          const next = upsertThread(
            prev,
            threadId,
            updater(current?.messages ?? []),
            t("aiStylePage.chat.untitled"),
          );
          saveLocalThreads(next);
          return next;
        });
      };
      if (!raw) setInput("");
      setSending(true);
      paint((prev) => [...prev, userMsg, { id: "pending", role: "assistant", content: "" }]);

      try {
        const payload = {
          message: trimmed,
          history,
          thread_id: threadId,
          persist,
          context: {
            ...(raw ? { voice_mode: true } : {}),
            care_condition: hair.condition,
            care_texture: hair.texture,
            care_color_status: hair.color_status,
            ...("scalp" in hair && hair.scalp ? { care_scalp: hair.scalp } : {}),
            ...("concerns" in hair && hair.concerns?.length
              ? { care_concerns: hair.concerns.join(", ") }
              : {}),
          },
        };
        let reply = "";
        let limits: MorphChatLimits;
        let hairstyles: ChatHairstyleCard[] | undefined;
        let blocks: ChatContentBlock[] | undefined;
        const liveBlocks: ChatContentBlock[] = [];
        stickToBottom.current = true;
        if (prefs.streaming && !raw) {
          const res = await streamMorphChatMessage(
            payload,
            (chunk) => {
              reply += chunk;
              paint((prev) => prev.map((m) => (m.id === "pending" ? { ...m, content: reply } : m)));
            },
            (block) => {
              liveBlocks.push(block);
              const next = [...liveBlocks];
              paint((prev) => prev.map((m) => (m.id === "pending" ? { ...m, blocks: next } : m)));
            },
          );
          reply = res.reply || reply;
          limits = res.limits;
          blocks = res.blocks?.length ? res.blocks : liveBlocks.length ? liveBlocks : undefined;
          hairstyles = res.hairstyles?.length ? res.hairstyles : cardsFromBlocks(blocks);
        } else {
          const res = await sendMorphChatMessage(payload);
          reply = res.reply;
          limits = res.limits;
          blocks = res.blocks;
          hairstyles = res.hairstyles?.length ? res.hairstyles : cardsFromBlocks(blocks);
        }
        paint((prev) =>
          prev.map((m) =>
            m.id === "pending"
              ? {
                  id: newId(),
                  role: "assistant",
                  content: reply,
                  ...(hairstyles?.length ? { hairstyles } : {}),
                  ...(blocks?.length ? { blocks } : {}),
                }
              : m,
          ),
        );
        applyLimits(limits);
        return reply;
      } catch (err) {
        paint((prev) => prev.filter((m) => m.id !== "pending" && m.id !== userMsg.id));
        if (!raw) setInput(trimmed);
        if (isMorphPlanLimitError(err)) {
          await gate.openFromApiLimit(raw ? "voice" : "chat");
          return null;
        }
        if (err instanceof MorphHairProfileRequiredError) {
          setHairDraft(trimmed);
          setChatOpen(true);
          return null;
        }
        const message = err instanceof Error ? err.message : t("aiStylePage.chat.error");
        const mobile =
          typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
        if (mobile) {
          lastFailedRef.current = trimmed;
          setSendError(message);
        } else {
          toast.error(message);
        }
        return null;
      } finally {
        setSending(false);
      }
    },
    [applyLimits, gate, hairQ.data, input, loggedIn, messages, navigate, sending, t],
  );

  const openThread = useCallback((id: string) => {
    const found = threads.find((thread) => thread.id === id);
    if (!found) return;
    activeThreadIdRef.current = id;
    setActiveThreadId(id);
    setMessages(found.messages);
    setHistoryOpen(false);
    setChatOpen(true);
    setHairDraft(null);
    stickToBottom.current = true;
  }, [threads]);

  const startNewChat = useCallback(() => {
    const id = newId();
    activeThreadIdRef.current = id;
    setActiveThreadId(id);
    setMessages([]);
    setHistoryOpen(false);
    setChatOpen(false);
    setHairDraft(null);
    rememberActiveId(id);
  }, []);

  const limits = liveLimits ?? privacy.query.data?.limits;
  const usedPct = chatUsagePct(limits);
  const planRemaining = gate.me?.usage?.morph_chat_tokens_remaining;
  const snapshotRemaining = limits?.token_remaining ?? limits?.daily_remaining;
  const remaining = typeof planRemaining === "number" ? planRemaining : snapshotRemaining;
  const chatLocked =
    (typeof remaining === "number" && remaining < 200) ||
    gate.me?.access?.morph_chat_allowed === false;

  useEffect(() => {
    if (!loggedIn) return;
    void gate.ensureChat();
  }, [gate.ensureChat, loggedIn]);

  const mobileChat = (
    <MorphChatAppView
      chatOpen={chatOpen}
      messages={messages}
      threads={threads}
      activeThreadId={activeThreadId}
      input={input}
      sending={sending}
      chatLocked={chatLocked}
      hairLoading={loggedIn && (hairQ.isLoading || hairQ.isPending) && !hairQ.data}
      hairRequired={Boolean(loggedIn && hairQ.isSuccess && !hairQ.data?.complete)}
      hairDraft={hairDraft}
      sendError={sendError}
      limitWarning={limitWarning}
      onInput={setInput}
      onSend={(text) => void send(text)}
      onQuick={(text) => void send(text)}
      onRetry={() => void send(lastFailedRef.current)}
      onDismissError={() => setSendError(null)}
      onDismissLimit={() => setLimitWarning(null)}
      onOpenLimit={() => void gate.openFromApiLimit("chat")}
      onNewChat={startNewChat}
      onOpenThread={openThread}
      onOpenSettings={() => setSettingsOpen(true)}
      onHairSaved={async (answers) => {
        const draft = hairDraft;
        setHairDraft(null);
        if (draft) await send(draft, answers);
      }}
    />
  );

  return (
    <>
    {mobileChat}
    <div className="hidden" aria-hidden>
      <header className="flex items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={() => navigateBack(router, "/ai-style")}
          className="hidden size-10 cursor-pointer place-items-center rounded-full bg-[var(--morph-card,#F0F0F0)] transition-transform active:scale-95 lg:grid"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[11px] font-semibold tracking-[0.2em]">
            {t("aiStylePage.chat.title")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="grid size-10 cursor-pointer place-items-center rounded-full bg-[#F0F0F0] active:scale-95 transition-transform"
          aria-label={t("aiStylePage.chat.history")}
        >
          <Menu className="size-[18px]" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="grid size-10 cursor-pointer place-items-center rounded-full bg-[#F0F0F0]"
          aria-label={t("aiStylePage.chat.settings")}
        >
          <Settings2 className="size-[18px]" strokeWidth={2} />
        </button>
      </header>

      {loggedIn && (hairQ.isLoading || hairQ.isPending) ? (
        <div className="grid flex-1 place-items-center">
          <Loader2 className="size-6 animate-spin text-[#111111]/40" />
        </div>
      ) : (
        <>
          {limitWarning ? (
            <div className="mx-4 mb-2 flex items-start gap-2 rounded-2xl bg-amber-100 px-3 py-2.5 text-sm text-amber-800">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p className="min-w-0 flex-1 leading-relaxed">{limitWarning}</p>
              <button
                type="button"
                className="cursor-pointer text-xs text-[#111111]/60"
                onClick={() => setLimitWarning(null)}
              >
                {t("common.close")}
              </button>
            </div>
          ) : null}

          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
            onScroll={(event) => {
              const el = event.currentTarget;
              stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            }}
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#F0F0F0] ring-1 ring-black/10">
                  <Sparkles className="size-5 text-[#111111]/80" strokeWidth={1.75} />
                </span>
                <h1 className="mt-4 text-[1.05rem] font-semibold tracking-tight">
                  {t("aiStylePage.chat.welcomeTitle")}
                </h1>
                <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[#111111]/50">
                  {t("aiStylePage.chat.welcomeBody")}
                </p>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pt-2">
                {messages.map((msg) => {
                  const rendered =
                    msg.role === "assistant"
                      ? visualBlocks(msg.content, msg.blocks, msg.hairstyles)
                      : [];
                  return (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                      msg.role === "user"
                        ? "ml-auto max-w-[85%] bg-white text-black"
                        : "mr-auto max-w-full bg-white text-[#111111] dark:bg-[#1C1C1C] dark:text-white",
                    )}
                  >
                    {rendered.length ? (
                      <ChatContentBlocks blocks={rendered} />
                    ) : (
                      msg.content || (msg.id === "pending" ? "…" : "")
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {chatLocked ? (
            <button
              type="button"
              onClick={() => void gate.openFromApiLimit("chat")}
              className="mx-4 mb-2 flex items-start gap-2 rounded-2xl bg-white px-3 py-2.5 text-left text-sm text-[#111111]/80 ring-1 ring-black/10"
            >
              <Lock className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
              <span className="min-w-0 flex-1 leading-relaxed">
                {t("aiStylePage.chat.tokenEmpty")}
              </span>
              <span className="shrink-0 text-xs font-semibold text-[#111111]">
                {t("aiStylePage.chat.tokenEmptyCta")}
              </span>
            </button>
          ) : null}

          <form
            className="mx-auto flex w-full max-w-2xl items-end gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (chatLocked) {
                void gate.openFromApiLimit("chat");
                return;
              }
              void send();
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (chatLocked) {
                    void gate.openFromApiLimit("chat");
                    return;
                  }
                  void send();
                }
              }}
              rows={1}
              disabled={sending || chatLocked}
              placeholder={
                chatLocked
                  ? t("aiStylePage.chat.tokenEmptyShort")
                  : t("aiStylePage.chat.placeholder")
              }
              className="max-h-24 min-h-10 flex-1 resize-none rounded-2xl bg-white px-4 py-2 text-[13px] text-[#111111] outline-none ring-1 ring-black/10 placeholder:text-[#111111]/35 disabled:opacity-50"
            />
            {input.trim() ? (
              <button
                type="submit"
                disabled={sending || !input.trim() || chatLocked}
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-2xl bg-white text-black disabled:opacity-40"
                aria-label={t("aiStylePage.chat.send")}
              >
                {sending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Send className="size-5" strokeWidth={2} />
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="grid size-10 shrink-0 cursor-not-allowed place-items-center rounded-2xl bg-black/5 text-[#111111]/30"
                aria-label={t("common.soon", { defaultValue: "Tez orada" })}
                title={t("common.soon", { defaultValue: "Tez orada" })}
              >
                <Mic className="size-4" strokeWidth={2.25} />
              </button>
            )}
          </form>
        </>
      )}
    </div>

      {historyOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-black/40"
            aria-label={t("common.close")}
            onClick={() => setHistoryOpen(false)}
          />
          <div className="relative flex h-full w-[min(100%,22rem)] flex-col bg-[#FAFAFA] text-[#111111] shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
              <p className="text-sm font-semibold">{t("aiStylePage.chat.history")}</p>
              <button
                type="button"
                className="grid size-9 cursor-pointer place-items-center rounded-full bg-[#F0F0F0]"
                aria-label={t("common.close")}
                onClick={() => setHistoryOpen(false)}
              >
                <X className="size-4" strokeWidth={2.25} />
              </button>
            </div>
            <button
              type="button"
              onClick={startNewChat}
              className="mx-4 mb-3 flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold ring-1 ring-black/10"
            >
              <Plus className="size-4" strokeWidth={2.25} />
              {t("aiStylePage.chat.newChat")}
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
              {threads.length === 0 ? (
                <p className="px-2 text-sm leading-relaxed text-[#111111]/50">
                  {t("aiStylePage.chat.historyEmpty")}
                </p>
              ) : (
                threads.map((thread) => {
                  const thumb = firstStyleImage(thread);
                  const preview =
                    [...thread.messages].reverse().find((message) => message.content.trim())?.content ||
                    thread.title;
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => openThread(thread.id)}
                      className={cn(
                        "mb-1 flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left",
                        thread.id === activeThreadId ? "bg-white ring-1 ring-black/10" : "hover:bg-white",
                      )}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="size-12 shrink-0 rounded-xl object-cover object-top"
                        />
                      ) : (
                        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#F0F0F0]">
                          <Sparkles className="size-4 text-[#111111]/55" strokeWidth={1.75} />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">{thread.title}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-[#111111]/45">
                          {preview}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="max-h-[86dvh] w-full max-w-md overflow-y-auto rounded-[28px] bg-[#FFFFFF] p-5 text-[#111111] shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold tracking-tight">
                {t("aiStylePage.chat.settings")}
              </h2>
              <button
                type="button"
                className="cursor-pointer text-[13px] text-[#111111]/55 transition-colors duration-200 hover:text-[#111111]"
                onClick={() => setSettingsOpen(false)}
              >
                {t("common.close")}
              </button>
            </div>
            {limits ? (
              <div className="mb-4 rounded-2xl bg-[#F0F0F0] p-4">
                <p className="text-[13px] font-medium">
                  {t("aiStylePage.chat.limitValue", { pct: usedPct })}
                </p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#F0F0F0]">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-[width] duration-300",
                      usedPct >= 90
                        ? "bg-red-500"
                        : usedPct >= 70
                          ? "bg-amber-400"
                          : "bg-[#34C759]",
                    )}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#111111]/45">
                  {t("aiStylePage.chat.limitHint", { pct: usedPct })}
                </p>
              </div>
            ) : null}
            <div className="divide-y divide-black/10 overflow-hidden rounded-2xl bg-[#F0F0F0]">
              <div className="px-4 py-3.5">
                <ChatPref
                  title={t("aiStylePage.chat.limitNotify")}
                  hint={t("aiStylePage.chat.limitNotifyHint")}
                  value={prefs.limitNotify}
                  onChange={(v) => {
                    setPrefs(patchMorphAiPrefs({ limitNotify: v }));
                    if (loggedIn) privacy.patch.mutate({ limit_notify: v });
                  }}
                />
              </div>
              <div className="px-4 py-3.5">
                <ChatPref
                  title={t("aiStylePage.chat.privacyLocal")}
                  hint={t("aiStylePage.chat.privacyLocalHint")}
                  value={prefs.privacyLocalOnly}
                  onChange={(v) => {
                    if (v && !window.confirm(t("aiStylePage.chat.privacyOnBody"))) return;
                    setPrefs(patchMorphAiPrefs({ privacyLocalOnly: v }));
                    if (loggedIn) privacy.patch.mutate({ privacy_local_only: v });
                  }}
                />
              </div>
              <div className="px-4 py-3.5">
                <ChatPref
                  title={t("aiStylePage.chat.persistLooks")}
                  hint={t("aiStylePage.chat.persistLooksHint")}
                  value={prefs.persistLooks}
                  onChange={(v) => {
                    setPrefs(patchMorphAiPrefs({ persistLooks: v }));
                    if (loggedIn) privacy.patch.mutate({ persist_looks: v });
                  }}
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer border-black/10 bg-transparent text-[#111111] hover:bg-[#F0F0F0]"
                onClick={() => {
                  if (!window.confirm(t("aiStylePage.chat.deleteChatsBody"))) return;
                  privacy.wipe.mutate("chats", {
                    onSuccess: () => {
                      const id = newId();
                      activeThreadIdRef.current = id;
                      setMessages([]);
                      setThreads([]);
                      setActiveThreadId(id);
                      localStorage.removeItem(THREADS_KEY);
                      localStorage.removeItem(LEGACY_THREADS_KEY);
                      rememberActiveId(id);
                      toast.success(t("aiStylePage.chat.deleted"));
                    },
                    onError: (err: Error) => toast.error(err.message),
                  });
                }}
              >
                {t("aiStylePage.chat.deleteChats")}
              </Button>
              <Link
                to="/privacy"
                className="inline-flex h-9 items-center rounded-md px-3 text-sm text-[#111111]/70 underline-offset-4 hover:underline"
              >
                {t("aiStylePage.chat.openDataPage")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <MorphLimitUpsell
        open={gate.open}
        onOpenChange={(open) => {
          gate.setOpen(open);
          if (!open) void gate.ensureChat({ silent: true });
        }}
        kind={gate.kind}
        me={gate.me}
      />

    </>
  );
}

function ChatPref({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-snug">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-[#111111]/45">{hint}</span>
      </span>
      <MorphToggle checked={value} onCheckedChange={onChange} />
    </label>
  );
}
