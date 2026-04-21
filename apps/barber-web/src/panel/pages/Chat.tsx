"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Send } from "lucide-react";
import { useState } from "react";

export default function Chat() {
  const {
    chatConversations,
    activeConversationId,
    setActiveConversationId,
    chatMessages,
    sendChatMessage,
  } = useApp();
  const [input, setInput] = useState("");

  const active = chatConversations.find((c) => c.id === activeConversationId) || chatConversations[0];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="px-4 md:px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold">Chat</h1>
        <p className="text-xs text-muted-foreground">
          {active ? active.other.full_name : "No conversations"}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-3">
        {chatMessages.map((msg) => {
          const isMe = msg.sender_kind === "BARBER";
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}>
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {msg.created_at.slice(11, 16)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          {chatConversations.length > 1 && (
            <select
              value={activeConversationId || ""}
              onChange={(e) => setActiveConversationId(e.target.value || null)}
              className="px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              {chatConversations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.other.full_name}
                </option>
              ))}
            </select>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <button
            onClick={() => {
              void sendChatMessage(input);
              setInput("");
            }}
            disabled={!activeConversationId}
            className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
