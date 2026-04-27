import { createFileRoute } from "@tanstack/react-router";
import ChatThread from "@/page-views/ChatThread";

export const Route = createFileRoute("/chat/$id")({
  component: ChatThread,
});

