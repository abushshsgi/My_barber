import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChatThreadList } from "@/components/chat/ChatThreadList";
import { ChatThreadView } from "@/components/chat/ChatThreadView";

export const Route = createFileRoute("/chat/$id")({
  head: () => ({ meta: [{ title: "Chat — mysaloon.uz" }] }),
  component: ChatThread,
});

function ChatThread() {
  const { id } = useParams({ from: "/chat/$id" });

  return (
    <>
      <div className="hidden lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[360px_1fr] lg:overflow-hidden lg:border-t lg:border-border">
        <ChatThreadList activeId={id} className="border-r border-border" />
        <ChatThreadView threadId={id} embedded />
      </div>
      <div className="lg:hidden">
        <ChatThreadView threadId={id} />
      </div>
    </>
  );
}
