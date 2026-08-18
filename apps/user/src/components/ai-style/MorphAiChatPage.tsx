import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Loader2, Mic, Send, Settings2, Sparkles, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MorphLimitUpsell } from "@/components/ai-style/MorphLimitUpsell";
import { MorphVoiceLiveOverlay } from "@/components/ai-style/MorphVoiceLiveOverlay";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMorphAiPrivacy } from "@/hooks/use-morph-ai-privacy";
import { useMorphLimitGate } from "@/hooks/use-morph-limit-gate";
import { useMorphVoiceChat } from "@/hooks/use-morph-voice";
import { hasValidUserSession } from "@/lib/api/client";
import { sendMorphChatMessage, streamMorphChatMessage, type MorphChatLimits } from "@/lib/api/ai";
import {
  patchMorphAiPrefs,
  readMorphAiPrefs,
  shouldPersistChatToServer,
} from "@/lib/morph-ai-prefs";
import { isMorphPlanLimitError } from "@/lib/morph-plan-limit";
import { cn } from "@/lib/utils";

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

const THREADS_KEY = "mysaloon.morphAi.chat.threads.v1";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadLocalMessages(): ChatMsg[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMsg[];
    return Array.isArray(parsed) ? parsed.filter((m) => m.content?.trim()) : [];
  } catch {
    return [];
  }
}

function saveLocalMessages(messages: ChatMsg[]) {
  if (typeof window === "undefined") return;
  const prefs = readMorphAiPrefs();
  if (!prefs.saveHistory) {
    localStorage.removeItem(THREADS_KEY);
    return;
  }
  localStorage.setItem(THREADS_KEY, JSON.stringify(messages.slice(-80)));
}

function fmtTokens(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toLocaleString("uz-UZ");
}

export function MorphAiChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loggedIn = hasValidUserSession();
  const gate = useMorphLimitGate();
  const privacy = useMorphAiPrivacy();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [prefs, setPrefs] = useState(readMorphAiPrefs);
  const listRef = useRef<HTMLDivElement>(null);
  const threadId = useMemo(() => {
    if (typeof window === "undefined") return "ssr";
    const existing = sessionStorage.getItem("mysaloon.morphAi.chat.threadId");
    if (existing) return existing;
    const id = newId();
    sessionStorage.setItem("mysaloon.morphAi.chat.threadId", id);
    return id;
  }, []);

  useEffect(() => {
    setMessages(loadLocalMessages());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveLocalMessages(messages);
  }, [hydrated, messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const applyLimits = useCallback(
    (limits: MorphChatLimits) => {
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
            remaining: (limits.token_remaining ?? limits.daily_remaining ?? 0).toLocaleString("uz-UZ"),
            limit: (limits.token_limit ?? limits.daily_limit).toLocaleString("uz-UZ"),
          }),
        );
      } else {
        setLimitWarning(null);
      }
    },
    [t],
  );

  const send = useCallback(
    async (raw?: string) => {
      const trimmed = (raw ?? input).trim();
      if (!trimmed || sending) return null;
      if (!loggedIn) {
        void navigate({ to: "/auth" });
        return null;
      }
      const allowed = await gate.ensureChat();
      if (!allowed) return null;

      const prefs = readMorphAiPrefs();
      const userMsg: ChatMsg = { id: newId(), role: "user", content: trimmed };
      const history = prefs.privacyLocalOnly
        ? []
        : messages.slice(-24).map((m) => ({ role: m.role, content: m.content }));
      const persist = shouldPersistChatToServer(prefs);
      if (!raw) setInput("");
      setSending(true);
      setMessages((prev) => [...prev, userMsg, { id: "pending", role: "assistant", content: "" }]);

      try {
        const payload = {
          message: trimmed,
          history,
          thread_id: threadId,
          persist,
          ...(raw ? { context: { voice_mode: true } } : {}),
        };
        let reply = "";
        let limits: MorphChatLimits;
        if (prefs.streaming && !raw) {
          const res = await streamMorphChatMessage(payload, (chunk) => {
            reply += chunk;
            setMessages((prev) =>
              prev.map((m) => (m.id === "pending" ? { ...m, content: reply } : m)),
            );
          });
          reply = res.reply;
          limits = res.limits;
        } else {
          const res = await sendMorphChatMessage(payload);
          reply = res.reply;
          limits = res.limits;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "pending" ? { id: newId(), role: "assistant", content: reply } : m,
          ),
        );
        applyLimits(limits);
        return reply;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== "pending" && m.id !== userMsg.id));
        if (!raw) setInput(trimmed);
        if (isMorphPlanLimitError(err)) {
          await gate.openFromApiLimit(raw ? "voice" : "chat");
          return null;
        }
        toast.error(err instanceof Error ? err.message : t("aiStylePage.chat.error"));
        return null;
      } finally {
        setSending(false);
      }
    },
    [applyLimits, gate, input, loggedIn, messages, navigate, sending, t, threadId],
  );

  const voice = useMorphVoiceChat({
    onTurn: async (text) => send(text),
    onLimit: () => void gate.openFromApiLimit("voice"),
  });

  const startVoice = useCallback(async () => {
    if (!loggedIn) {
      void navigate({ to: "/auth" });
      return;
    }
    const allowed = await gate.ensureVoice();
    if (!allowed) return;
    void voice.toggleLive();
  }, [gate, loggedIn, navigate, voice]);

  const limits = privacy.query.data?.limits;
  const remaining = limits?.token_remaining ?? limits?.daily_remaining;
  const usedVal = limits?.token_used ?? limits?.daily_used;
  const limitVal = limits?.token_limit ?? limits?.daily_limit;
  const usedPct =
    limits && limitVal && usedVal != null
      ? Math.min(100, Math.round((usedVal / limitVal) * 100))
      : 0;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#050505] text-white lg:min-h-0">
      <header className="flex items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={() => navigate({ to: "/ai-style" })}
          className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/12"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[13px] font-extrabold tracking-[0.18em]">
            {t("aiStylePage.chat.title")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/12"
          aria-label={t("aiStylePage.chat.settings")}
        >
          <Settings2 className="size-[18px]" strokeWidth={2} />
        </button>
      </header>

      {limitWarning ? (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-2xl bg-amber-500/15 px-3 py-2.5 text-sm text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p className="min-w-0 flex-1 leading-relaxed">{limitWarning}</p>
          <button
            type="button"
            className="cursor-pointer text-xs text-white/60"
            onClick={() => setLimitWarning(null)}
          >
            {t("common.close")}
          </button>
        </div>
      ) : null}

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[48vh] flex-col items-center justify-center text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
              <Sparkles className="size-6 text-white/80" strokeWidth={1.75} />
            </span>
            <h1 className="mt-5 text-xl font-semibold tracking-tight">
              {t("aiStylePage.chat.welcomeTitle")}
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/50">
              {t("aiStylePage.chat.welcomeBody")}
            </p>
            <button
              type="button"
              onClick={() => void startVoice()}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black"
            >
              <Mic className="size-4" strokeWidth={2.25} />
              {t("aiStylePage.chat.voiceStart")}
            </button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pt-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "ml-auto bg-white text-black"
                    : "mr-auto bg-white/[0.08] text-white",
                )}
              >
                {msg.content || (msg.id === "pending" ? "…" : "")}
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        className="mx-auto flex w-full max-w-2xl items-end gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder={t("aiStylePage.chat.placeholder")}
          className="min-h-12 max-h-32 flex-1 resize-none rounded-2xl bg-white/[0.08] px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/35"
        />
        {input.trim() ? (
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-white text-black disabled:opacity-40"
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
            onClick={() => void startVoice()}
            disabled={sending}
            className="relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-white text-black disabled:opacity-40"
            aria-label={t("aiStylePage.chat.voiceStart")}
          >
            <span className="morph-voice-mic-ring pointer-events-none absolute inset-0 rounded-2xl" />
            <Mic className="size-5" strokeWidth={2.25} />
          </button>
        )}
      </form>

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="max-h-[86dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#1C1C1E] p-5 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("aiStylePage.chat.settings")}</h2>
              <button
                type="button"
                className="cursor-pointer text-sm text-white/60"
                onClick={() => setSettingsOpen(false)}
              >
                {t("common.close")}
              </button>
            </div>
            {limits ? (
              <div className="mb-4 rounded-2xl bg-white/[0.06] p-4">
                <p className="text-sm font-medium">
                  {t("aiStylePage.chat.limitValue", {
                    used: fmtTokens(usedVal),
                    limit: fmtTokens(limitVal),
                  })}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-2 rounded-full",
                      usedPct >= 90 ? "bg-red-500" : usedPct >= 70 ? "bg-amber-400" : "bg-sky-500",
                    )}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/50">
                  {t("aiStylePage.chat.limitHint", { remaining: fmtTokens(remaining) })}
                </p>
              </div>
            ) : null}
            <div className="space-y-4">
              <ChatPref
                title={t("aiStylePage.chat.limitNotify")}
                hint={t("aiStylePage.chat.limitNotifyHint")}
                value={prefs.limitNotify}
                onChange={(v) => {
                  setPrefs(patchMorphAiPrefs({ limitNotify: v }));
                  if (loggedIn) privacy.patch.mutate({ limit_notify: v });
                }}
              />
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
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={() => {
                  if (!window.confirm(t("aiStylePage.chat.deleteChatsBody"))) return;
                  privacy.wipe.mutate("chats", {
                    onSuccess: () => {
                      setMessages([]);
                      localStorage.removeItem(THREADS_KEY);
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
                className="inline-flex h-9 items-center rounded-md px-3 text-sm text-white/70 underline-offset-4 hover:underline"
              >
                {t("aiStylePage.chat.openDataPage")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <MorphLimitUpsell
        open={gate.open}
        onOpenChange={gate.setOpen}
        kind={gate.kind}
        me={gate.me}
      />

      {voice.open ? (
        <MorphVoiceLiveOverlay
          phase={voice.phase}
          metering={voice.metering}
          transcript={voice.transcript}
          reply={voice.reply}
          error={voice.error}
          title={t("aiStylePage.chat.voiceLiveTitle")}
          listeningLabel={t("aiStylePage.chat.voiceListening")}
          listeningHint={t("aiStylePage.chat.voiceListeningHint")}
          transcribingLabel={t("aiStylePage.chat.voiceTranscribing")}
          thinkingLabel={t("aiStylePage.chat.voiceThinking")}
          speakingLabel={t("aiStylePage.chat.voiceSpeaking")}
          yourTurnLabel={t("aiStylePage.chat.voiceYourTurn")}
          tapToSend={t("aiStylePage.chat.voiceTapSend")}
          interruptLabel={t("aiStylePage.chat.voiceInterrupt")}
          closeA11y={t("common.close")}
          onClose={() => void voice.cancelSession()}
          onPrimary={() => {
            if (voice.phase === "recording") void voice.stopListening();
            else if (voice.phase === "speaking") void voice.interrupt();
            else if (voice.phase === "waiting") void voice.startListening();
            else void voice.cancelSession();
          }}
        />
      ) : null}
    </div>
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
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-white/50">{hint}</span>
      </span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}
