import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Loader2, Lock, Mic, Send, Settings2, Sparkles, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { navigateBack } from "@/lib/mobile-back";
import { MorphLimitUpsell } from "@/components/ai-style/MorphLimitUpsell";
import { MorphToggle } from "@/components/ai-style/MorphToggle";
import { MorphVoiceLiveOverlay } from "@/components/ai-style/MorphVoiceLiveOverlay";
import { Button } from "@/components/ui/button";
import { useMorphAiPrivacy } from "@/hooks/use-morph-ai-privacy";
import { useMorphLimitGate } from "@/hooks/use-morph-limit-gate";
import { useMorphVoiceChat } from "@/hooks/use-morph-voice";
import { hasValidUserSession } from "@/lib/api/client";
import { sendMorphChatMessage, streamMorphChatMessage, type MorphChatLimits } from "@/lib/api/ai";
import { useHairCareProfile } from "@/hooks/use-hair-care-profile";
import {
  patchMorphAiPrefs,
  readMorphAiPrefs,
  shouldPersistChatToServer,
} from "@/lib/morph-ai-prefs";
import { isMorphPlanLimitError, MorphHairProfileRequiredError } from "@/lib/morph-plan-limit";
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
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [liveLimits, setLiveLimits] = useState<MorphChatLimits | null>(null);
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
    async (raw?: string) => {
      const trimmed = (raw ?? input).trim();
      if (!trimmed || sending) return null;
      if (!loggedIn) {
        void navigate({ to: "/auth" });
        return null;
      }
      if (!hairQ.data?.complete) {
        void navigate({ to: "/ai-style/care" });
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
          context: {
            ...(raw ? { voice_mode: true } : {}),
            ...(hairQ.data?.complete
              ? {
                  care_condition: hairQ.data.condition,
                  care_texture: hairQ.data.texture,
                  care_color_status: hairQ.data.color_status,
                  ...(hairQ.data.scalp ? { care_scalp: hairQ.data.scalp } : {}),
                  ...(hairQ.data.concerns?.length
                    ? { care_concerns: hairQ.data.concerns.join(", ") }
                    : {}),
                }
              : {}),
          },
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
        if (err instanceof MorphHairProfileRequiredError) {
          void navigate({ to: "/ai-style/care" });
          return null;
        }
        toast.error(err instanceof Error ? err.message : t("aiStylePage.chat.error"));
        return null;
      } finally {
        setSending(false);
      }
    },
    [applyLimits, gate, hairQ.data, input, loggedIn, messages, navigate, sending, t, threadId],
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

  const limits = liveLimits ?? privacy.query.data?.limits;
  const usedPct = chatUsagePct(limits);
  const remaining = limits?.token_remaining ?? limits?.daily_remaining;
  const chatLocked =
    (typeof remaining === "number" && remaining < 200) ||
    gate.me?.access?.morph_chat_allowed === false;

  useEffect(() => {
    if (!loggedIn) return;
    void gate.ensureChat();
  }, [gate.ensureChat, loggedIn]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FAFAFA] text-[#111111] lg:min-h-0">
      <header className="flex items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={() => navigateBack(router, "/ai-style")}
          className="grid size-10 cursor-pointer place-items-center rounded-full bg-[#F0F0F0] active:scale-95 transition-transform"
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
      ) : loggedIn && !hairQ.data?.complete ? (
        <div className="mx-auto flex min-h-0 flex-1 max-w-sm flex-col items-center justify-center px-6 text-center">
          <Lock className="size-6 text-[#111111]/45" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            {t("aiStylePage.chat.hairGate.title", {
              defaultValue: "Avval soch holatingizni ayting",
            })}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#111111]/55">
            {t("aiStylePage.chat.hairGate.body", {
              defaultValue:
                "To‘liq holatni tanlamaguncha chatbot va parvarish rejasini ocholmaymiz. Shunga qarab mos maslahat, reja va mahsulot beramiz.",
            })}
          </p>
          <Link
            to="/ai-style/care"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-[#111111] px-6 text-sm font-semibold text-white"
          >
            {t("aiStylePage.chat.hairGate.cta", { defaultValue: "Holatimni belgilash" })}
          </Link>
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

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[48vh] flex-col items-center justify-center text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-[#F0F0F0] ring-1 ring-black/10">
              <Sparkles className="size-6 text-[#111111]/80" strokeWidth={1.75} />
            </span>
            <h1 className="mt-5 text-[1.15rem] font-semibold tracking-tight">
              {t("aiStylePage.chat.welcomeTitle")}
            </h1>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[#111111]/50">
              {t("aiStylePage.chat.welcomeBody")}
            </p>
            <button
              type="button"
              onClick={() => {
                if (chatLocked) {
                  void gate.openFromApiLimit("chat");
                  return;
                }
                void startVoice();
              }}
              disabled={sending || chatLocked}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-black disabled:opacity-40"
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
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                  msg.role === "user"
                    ? "ml-auto bg-white text-black"
                    : "mr-auto bg-white text-[#111111]",
                )}
              >
                {msg.content || (msg.id === "pending" ? "…" : "")}
              </div>
            ))}
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
          <span className="min-w-0 flex-1 leading-relaxed">{t("aiStylePage.chat.tokenEmpty")}</span>
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
            chatLocked ? t("aiStylePage.chat.tokenEmptyShort") : t("aiStylePage.chat.placeholder")
          }
          className="min-h-12 max-h-32 flex-1 resize-none rounded-2xl bg-white px-4 py-3 text-[13px] text-[#111111] outline-none ring-1 ring-black/10 placeholder:text-[#111111]/35 disabled:opacity-50"
        />
        {input.trim() ? (
          <button
            type="submit"
            disabled={sending || !input.trim() || chatLocked}
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
            onClick={() => {
              if (chatLocked) {
                void gate.openFromApiLimit("chat");
                return;
              }
              void startVoice();
            }}
            disabled={sending || chatLocked}
            className="relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-white text-black disabled:opacity-40"
            aria-label={t("aiStylePage.chat.voiceStart")}
          >
            <span className="morph-voice-mic-ring pointer-events-none absolute inset-0 rounded-2xl" />
            <Mic className="size-5" strokeWidth={2.25} />
          </button>
        )}
      </form>
        </>
      )}

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
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-snug">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-[#111111]/45">{hint}</span>
      </span>
      <MorphToggle checked={value} onCheckedChange={onChange} />
    </label>
  );
}
