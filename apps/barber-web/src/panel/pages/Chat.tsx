"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Chat() {
  const {
    chatConversations,
    activeConversationId,
    setActiveConversationId,
    chatMessages,
    sendChatMessage,
  } = useApp();
  const [input, setInput] = useState("");

  const active =
    chatConversations.find((c) => c.id === activeConversationId) || chatConversations[0];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      <aside className="w-full sm:w-80 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Suhbatlar</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatConversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveConversationId(c.id)}
              className={cn(
                "w-full p-4 flex items-center gap-3 text-left border-b border-border hover:bg-muted/40 transition-colors",
                activeConversationId === c.id && "bg-muted/60"
              )}
            >
              <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold">
                {c.other.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm truncate">{c.other.full_name}</div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {(c.last_message_at || c.updated_at || "").slice(11, 16)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.last_message_text}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="hidden sm:flex flex-1 flex-col bg-background">
        {active ? (
          <>
            <header className="h-16 px-5 border-b border-border bg-card flex items-center gap-3">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                {active.other.full_name.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-sm">{active.other.full_name}</div>
                <div className="text-xs text-muted-foreground">Online</div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {chatMessages.map((m) => {
                const mine = m.sender_kind === "BARBER";
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm",
                        mine
                          ? "bg-foreground text-background rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      )}
                    >
                      <div>{m.text}</div>
                      <div
                        className={cn(
                          "text-[10px] mt-1",
                          mine ? "opacity-60" : "text-muted-foreground"
                        )}
                      >
                        {m.created_at.slice(11, 16)}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void sendChatMessage(input);
                      setInput("");
                    }
                  }}
                  placeholder="Xabar yozing..."
                  className="flex-1 h-11 px-4 rounded-xl bg-muted focus:bg-background border border-transparent focus:border-border focus:ring-2 focus:ring-ring outline-none text-sm transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    void sendChatMessage(input);
                    setInput("");
                  }}
                  disabled={!activeConversationId || !input.trim()}
                  className="size-11 rounded-xl bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
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
