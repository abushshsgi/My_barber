import { createFileRoute } from "@tanstack/react-router";
import UserAuth from "@/page-views/UserAuth";

export const Route = createFileRoute("/auth")({
  component: UserAuth,
});

