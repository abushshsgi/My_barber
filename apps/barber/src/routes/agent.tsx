import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { AgentShell } from "@/components/agent/AgentShell";
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
  component: AgentLayout,
});

function AgentLayout() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/agent/login")) {
    return <Outlet />;
  }
  return <AgentShell />;
}
