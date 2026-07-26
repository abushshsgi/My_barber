import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAgentAccessToken } from "@/lib/agent-api";

export const Route = createFileRoute("/agent")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    const path = location.pathname;
    if (path === "/agent/login" || path.startsWith("/agent/login")) return;
    if (!getAgentAccessToken()) {
      throw redirect({ to: "/agent/login" });
    }
  },
  component: () => <Outlet />,
});
