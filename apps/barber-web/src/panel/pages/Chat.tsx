"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Send } from "lucide-react";
import { useState } from "react";

export default function Chat() {
  const { messages } = useApp();
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="px-4 md:px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold">Chat</h1>
        <p className="text-xs text-muted-foreground">Alex Johnson</p>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}>
              <p>{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <button className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
