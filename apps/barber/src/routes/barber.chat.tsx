import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { buildChatWebSocketUrl } from "@mybarber/shared/ws-url";
import { useBarberContext } from "@/components/barber/BarberContext";
import { UserAvatar } from "@/components/barber/primitives";
import { API_BASE, getBarberAccessToken } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/chat")({
  component: ChatPage,
});

function ChatPage() {
  const { conversations, sendChatMessage, loadConversationMessages, applyIncomingChatMessage } =
    useBarberContext();
  const [activeId, setActiveId] = useState(conversations[0]?.id ?? "");
  /** Mobil: ro‘yxat yoki ochiq thread */
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [input, setInput] = useState("");

  const active = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("conversation_id");
    if (targetId && conversations.some((c) => c.id === targetId)) {
      setActiveId(targetId);
      if (window.matchMedia("(max-width: 639px)").matches) {
        setMobileThreadOpen(true);
      }
      return;
    }
    if (!activeId && conversations[0]) setActiveId(conversations[0].id);
  }, [activeId, conversations]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const onWide = () => {
      if (mq.matches) setMobileThreadOpen(false);
    };
    mq.addEventListener("change", onWide);
    return () => mq.removeEventListener("change", onWide);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;
    if (conv.messages && conv.messages.length) return;
    void loadConversationMessages(activeId);
  }, [activeId, conversations, loadConversationMessages]);

  useEffect(() => {
    const token = getBarberAccessToken();
    if (!activeId || !token) return;
    let disposed = false;
    let opened = false;
    const wsUrl = buildChatWebSocketUrl(API_BASE, activeId, token);
    let wsHost = "";
    try {
      wsHost = new URL(wsUrl.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:")).host;
    } catch {
      wsHost = "parse_fail";
    }
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      opened = true;
    };
    ws.onerror = () => {
      console.warn("[barber chat] WebSocket xato", { wsHost });
      toast.error("Chat ulanishi xato. Internet yoki serverni tekshiring.");
    };
    ws.onclose = (ev) => {
      if (!disposed && opened && (!ev.wasClean || ev.code !== 1000)) {
        toast.message(
          "Chat uzildi. Ulanishni tiklash uchun sahifani yangilang yoki suhbatni qayta tanlang.",
          { duration: 6000 },
        );
      }
    };
    ws.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data) as {
          type?: string;
          message?: { id: number; sender_kind: "USER" | "BARBER"; text: string; created_at: string };
        };
        if (payload.type === "message" && payload.message) {
          applyIncomingChatMessage(activeId, payload.message);
        }
      } catch {
        // ignore
      }
    };
    return () => {
      disposed = true;
      ws.close();
    };
  }, [activeId, applyIncomingChatMessage]);

  const handleSend = () => {
    if (!input.trim() || !active) return;
    sendChatMessage(active.id, input.trim());
    setInput("");
  };

  const selectConversation = (id: string) => {
    setActiveId(id);
    if (window.matchMedia("(max-width: 639px)").matches) {
      setMobileThreadOpen(true);
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Conversation list */}
      <aside
        className={cn(
          "w-full sm:w-80 shrink-0 border-r border-border bg-card flex flex-col",
          mobileThreadOpen && "hidden sm:flex",
        )}
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-heading text-lg font-semibold">Suhbatlar</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectConversation(c.id)}
              className={cn(
                "w-full p-4 flex items-center gap-3 text-left border-b border-border hover:bg-muted/40 transition-colors",
                activeId === c.id && "bg-muted/60",
              )}
            >
              <UserAvatar src={c.avatar} name={c.client} className="size-10 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm truncate">{c.client}</div>
                  <div className="text-xs text-muted-foreground shrink-0">{c.time}</div>
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.preview}</div>
              </div>
              {c.unread > 0 && (
                <span className="size-5 shrink-0 rounded-full bg-foreground text-background text-[10px] flex items-center justify-center font-medium">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Active conversation */}
      <section
        className={cn(
          "flex-1 flex-col bg-background min-h-0",
          mobileThreadOpen ? "flex" : "hidden sm:flex",
        )}
      >
        {active ? (
          <>
            <header className="h-16 px-5 border-b border-border bg-card flex items-center gap-3 shrink-0">
              <button
                type="button"
                className="sm:hidden rounded-xl p-2 hover:bg-muted/60 -ml-2"
                aria-label="Suhbatlar ro‘yxati"
                onClick={() => setMobileThreadOpen(false)}
              >
                <ArrowLeft className="size-5" />
              </button>
              <UserAvatar src={active.avatar} name={active.client} className="size-10" />
              <div>
                <div className="font-medium text-sm">{active.client}</div>
                <div className="text-xs text-muted-foreground">Chat</div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
              {(active.messages ?? []).map((m) => {
                const mine = m.sender_kind === "BARBER";
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm",
                        mine
                          ? "bg-foreground text-background rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md",
                      )}
                    >
                      <div>{m.text}</div>
                      <div
                        className={cn(
                          "text-[10px] mt-1",
                          mine ? "opacity-60" : "text-muted-foreground",
                        )}
                      >
                        {m.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <footer className="p-4 border-t border-border bg-card shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Xabar yozing..."
                  className="flex-1 h-11 px-4 rounded-xl bg-muted focus:bg-background border border-transparent focus:border-border focus:ring-2 focus:ring-ring outline-none text-sm transition-colors"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  className="size-11 rounded-xl bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
                  aria-label="Yuborish"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Suhbatni tanlang
          </div>
        )}
      </section>
    </div>
  );
}
