import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Send, Phone, MoreVertical, Image as ImageIcon, Smile, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { chatMessages, chatThreads } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$id")({
  head: () => ({ meta: [{ title: "Chat — mysaloon.uz" }] }),
  component: ChatThread,
});

const QUICK_REPLIES = ["Salom!", "Vaqt bo'shmi?", "Narxi qancha?", "Rahmat 🙏"];

interface Msg {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
  read?: boolean;
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function ChatThread() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/chat/$id" });
  const thread = chatThreads.find((c) => c.id === id) ?? chatThreads[0];
  const [messages, setMessages] = useState<Msg[]>(
    (chatMessages[id] ?? []).map((m) => ({ ...m, read: true })),
  );
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = (text: string) => {
    const v = text.trim();
    if (!v) return;
    const now = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      { id: `m${Date.now()}`, fromMe: true, text: v, time: now, read: false },
    ]);
    setInput("");
    // Mock: barber "javob yozmoqda" + auto-reply
    setTimeout(() => setTyping(true), 400);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `b${Date.now()}`,
          fromMe: false,
          text: "Tushundim, bir daqiqada javob beraman.",
          time: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 2000);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Sticky header with avatar + online */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur-md"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <Link
          to="/chat"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface active:scale-95"
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
            {typing ? "yozmoqda..." : "onlayn · " + thread.salonName}
          </p>
        </div>
        <button className="grid h-9 w-9 place-items-center rounded-full bg-surface active:scale-95">
          <Phone className="h-4 w-4" />
        </button>
        <button className="grid h-9 w-9 place-items-center rounded-full bg-surface active:scale-95">
          <MoreVertical className="h-4 w-4" />
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
        {/* Date separator */}
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
                    ? "bg-foreground text-background rounded-2xl rounded-br-md"
                    : "bg-surface text-foreground rounded-2xl rounded-bl-md",
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
                  {m.fromMe && (m.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        <AnimatePresence>
          {typing && (
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
          )}
        </AnimatePresence>
      </div>

      {/* Quick replies */}
      {messages.length < 4 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="shrink-0 rounded-full border border-border bg-background px-3.5 py-1.5 text-[12px] font-bold active:scale-95"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div
        className="sticky bottom-0 z-20 border-t border-border bg-background/95 px-3 pt-3 backdrop-blur-md lg:left-[240px]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        <div className="flex items-end gap-2">
          <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface active:scale-95">
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
