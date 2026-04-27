import { createFileRoute } from "@tanstack/react-router";
import ChatList from "@/page-views/ChatList";

export const Route = createFileRoute("/chat")({
  component: ChatList,
});

