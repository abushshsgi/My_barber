import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/chat")({
  component: ChatPage,
});

function ChatPage() {
  const { conversations, sendChatMessage } = useBarberContext();
  const [activeId, setActiveId] = useState(conversations[0]?.id ?? "");
  const [input, setInput] = useState("");

  const active = conversations.find((c) => c.id === activeId);

  const handleSend = () => {
    if (!input.trim() || !active) return;
    sendChatMessage(active.id, input.trim());
    setInput("");
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Conversation list */}
      <aside className="w-full sm:w-80 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-heading text-lg font-semibold">Suhbatlar</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "w-full p-4 flex items-center gap-3 text-left border-b border-border hover:bg-muted/40 transition-colors",
                activeId === c.id && "bg-muted/60",
              )}
            >
              <img src={c.avatar} alt="" className="size-10 rounded-full shrink-0" />
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
      <section className="hidden sm:flex flex-1 flex-col bg-background">
        {active ? (
          <>
            <header className="h-16 px-5 border-b border-border bg-card flex items-center gap-3">
              <img src={active.avatar} alt="" className="size-10 rounded-full" />
              <div>
                <div className="font-medium text-sm">{active.client}</div>
                <div className="text-xs text-muted-foreground">Online</div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {active.messages.map((m) => {
                const mine = m.sender_kind === "BARBER";
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm",
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

            <footer className="p-4 border-t border-border bg-card">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Xabar yozing..."
                  className="flex-1 h-11 px-4 rounded-xl bg-muted focus:bg-background border border-transparent focus:border-border focus:ring-2 focus:ring-ring outline-none text-sm transition-colors"
                />
                <button
                  onClick={handleSend}
                  className="size-11 rounded-xl bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
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
