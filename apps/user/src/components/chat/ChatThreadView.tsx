import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Image as ImageIcon,
  MoreVertical,
  Phone,
  Send,
  Smile,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useChatMessages, useConversations, useSendChatMessage } from "@/hooks/use-chat-api";
import { useChatWebSocket } from "@/hooks/use-chat-websocket";
import { cn } from "@/lib/utils";

const QUICK_REPLIES = ["Salom!", "Vaqt bo'shmi?", "Narxi qancha?", "Rahmat 🙏"];

interface Msg {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
  read?: boolean;
}

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
  const thread = threads.find((c) => c.id === threadId) ?? threads[0];
  const { data: apiMessages = [], isLoading } = useChatMessages(threadId);
  const sendMessage = useSendChatMessage(threadId);
  useChatWebSocket(threadId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(apiMessages.map((m) => ({ ...m, read: true })));
  }, [apiMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  if (isLoading || !thread) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <Link to="/chat" className="text-sm font-bold">
            {t("common.back")}
          </Link>
        )}
      </div>
    );
  }

  const send = (text: string) => {
    const v = text.trim();
    if (!v) return;
    const now = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      { id: `m${Date.now()}`, fromMe: true, text: v, time: now, read: false },
    ]);
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
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface active:scale-95 lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="relative shrink-0">
          <div
            className="grid h-10 w-10 place-items-center rounded-full text-xs font-bold text-background"
            style={{
              background: `linear-gradient(135deg, oklch(0.55 0.05 ${(thread.id.charCodeAt(0) * 30) % 360}), oklch(0.25 0.02 ${(thread.id.charCodeAt(0) * 30 + 60) % 360}))`,
            }}
          >
            {initials(thread.barberName)}
          </div>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-foreground ring-2 ring-background" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold">{thread.barberName}</h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {typing ? "yozmoqda..." : `onlayn · ${thread.salonName}`}
          </p>
        </div>
        <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-surface active:scale-95">
          <Phone className="h-4 w-4" />
        </button>
        <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-surface active:scale-95">
          <MoreVertical className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
        <div className="my-2 flex items-center justify-center">
          <span className="rounded-full bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Bugun
          </span>
        </div>

        {messages.map((m, i) => {
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
                <div
                  className={cn(
                    "mt-0.5 flex items-center justify-end gap-1 text-[10px] font-bold",
                    m.fromMe ? "text-background/60" : "text-muted-foreground",
                  )}
                >
                  <span>{m.time}</span>
                  {m.fromMe ? (m.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />) : null}
                </div>
              </div>
            </motion.div>
          );
        })}

        <AnimatePresence>
          {typing ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-foreground/60"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
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
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface active:scale-95">
            <ImageIcon className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-4 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder={t("chat.placeholder")}
              className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
            />
            <Smile className="h-4 w-4 text-muted-foreground" />
          </div>
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim()}
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
