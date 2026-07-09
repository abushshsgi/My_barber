import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { mobileBackButtonClass } from "@/components/mobile/MobileBackButton";
import {
  useChatMessages,
  useConversations,
  useMarkConversationRead,
  useSendChatMessage,
} from "@/hooks/use-chat-api";
import { useChatWebSocket } from "@/hooks/use-chat-websocket";
import { cn } from "@/lib/utils";

const QUICK_REPLIES = ["Salom!", "Vaqt bo'shmi?", "Narxi qancha?", "Rahmat 🙏"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Props = {
  threadId: string;
  embedded?: boolean;
};

export function ChatThreadView({ threadId, embedded }: Props) {
  const { t } = useTranslation();
  const { data: threads = [] } = useConversations();
  const thread = threads.find((c) => c.id === threadId);
  const { data: messages = [], isLoading } = useChatMessages(threadId);
  const sendMessage = useSendChatMessage(threadId);
  const markRead = useMarkConversationRead(threadId);
  useChatWebSocket(threadId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) return;
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mark read once per thread
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center">
        <Link to="/chat" className="text-sm font-bold">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const send = (text: string) => {
    const v = text.trim();
    if (!v || sendMessage.isPending) return;
    setInput("");
    sendMessage.mutate(v);
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-background", !embedded && "min-h-[100dvh]")}>
      <header
        className={cn(
          "sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur-md",
          !embedded && "lg:top-0",
        )}
        style={embedded ? undefined : { paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <Link
          to="/chat"
          className={cn(mobileBackButtonClass, "lg:hidden")}
          aria-label={t("common.back")}
        >
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </Link>
        <div className="relative shrink-0">
          {thread.avatarUrl ? (
            <img src={thread.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div
              className="grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-background"
              style={{
                background: `linear-gradient(135deg, oklch(0.55 0.05 ${(thread.id.charCodeAt(0) * 30) % 360}), oklch(0.25 0.02 ${(thread.id.charCodeAt(0) * 30 + 60) % 360}))`,
              }}
            >
              {initials(thread.barberName)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold">{thread.barberName}</h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {thread.salonName}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("chat.empty")}</p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const grouped = prev && prev.fromMe === m.fromMe;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={cn("flex", m.fromMe ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-2")}
              >
                <div
                  className={cn(
                    "max-w-[78%] px-4 py-2",
                    m.fromMe
                      ? "rounded-2xl rounded-br-md bg-foreground text-background"
                      : "rounded-2xl rounded-bl-md bg-surface text-foreground",
                  )}
                >
                  <p className="text-sm font-medium leading-snug">{m.text}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-right text-[10px] font-bold",
                      m.fromMe ? "text-background/60" : "text-muted-foreground",
                    )}
                  >
                    {m.time}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {messages.length < 4 ? (
        <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="shrink-0 rounded-full border border-border bg-background px-3.5 py-1.5 text-[12px] font-bold active:scale-95"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "sticky bottom-0 z-20 shrink-0 border-t border-border bg-background/95 px-3 pt-3 backdrop-blur-md",
          embedded ? "lg:pb-4" : "lg:static",
        )}
        style={embedded ? undefined : { paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        <div className="flex items-end gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-4 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder={t("chat.placeholder")}
              className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || sendMessage.isPending}
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all",
              input.trim() ? "bg-foreground text-background active:scale-95" : "bg-surface text-muted-foreground",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
