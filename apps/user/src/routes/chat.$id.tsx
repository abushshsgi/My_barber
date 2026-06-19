import { createFileRoute, useParams } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ChatDesktopThread } from "@/components/desktop/pages/ChatDesktopPage";
import { ChatThreadView } from "@/components/chat/ChatThreadView";

export const Route = createFileRoute("/chat/$id")({
  head: () => ({ meta: [{ title: "Chat — mysaloon.uz" }] }),
  component: ChatThread,
});

function ChatThread() {
  const { id } = useParams({ from: "/chat/$id" });

  return (
    <DesktopPageSplit
      mobile={<ChatThreadView threadId={id} />}
      desktop={<ChatDesktopThread threadId={id} />}
    />
  );
}
