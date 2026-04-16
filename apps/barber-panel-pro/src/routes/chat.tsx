import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { useConversations, useConversationMessages, useSendMessage } from "@/lib/chat-queries";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const convos = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const messagesQ = useConversationMessages(selectedId);
  const send = useSendMessage(selectedId);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!selectedId && convos.data && convos.data.length) {
      setSelectedId(convos.data[0].id);
    }
  }, [selectedId, convos.data]);

  const messages = useMemo(() => messagesQ.data?.results ?? [], [messagesQ.data]);

  return (
    <>
      <Topbar title="Chat" />
      <div className="flex h-[calc(100vh-3.5rem)]">
        <div className="w-80 border-r border-border bg-card">
          <div className="p-4">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Conversations</p>
          </div>
          <div className="space-y-1 px-2 pb-3">
            {(convos.data ?? []).map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left transition-colors",
                    active ? "bg-muted" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{c.user_name || "Client"}</p>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    {c.last_message_text || "—"}
                  </p>
                </button>
              );
            })}
            {convos.isLoading && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
            )}
            {!convos.isLoading && (convos.data?.length ?? 0) === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No conversations yet.</div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-2xl space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender_kind === "BARBER";
                const time = new Date(msg.created_at);
                const hh = Number.isNaN(time.getTime())
                  ? ""
                  : `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-xs rounded-2xl px-4 py-2.5",
                        isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      <p className="text-[13px]">{msg.text}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                        )}
                      >
                        {hh}
                      </p>
                    </div>
                  </div>
                );
              })}
              {messagesQ.isLoading && (
                <div className="text-sm text-muted-foreground">Loading messages...</div>
              )}
              {!messagesQ.isLoading && selectedId && messages.length === 0 && (
                <div className="text-sm text-muted-foreground">No messages.</div>
              )}
              {!selectedId && (
                <div className="text-sm text-muted-foreground">Select a conversation.</div>
              )}
            </div>
          </div>

          <form
            className="border-t border-border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = text.trim();
              if (!trimmed) return;
              send.mutate(trimmed, {
                onSuccess: () => setText(""),
              });
            }}
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!selectedId || send.isPending}
                type="text"
                placeholder={!selectedId ? "Select a conversation..." : "Type a message..."}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!selectedId || send.isPending}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <Send className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
