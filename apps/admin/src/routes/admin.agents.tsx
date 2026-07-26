import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/agents")({
  component: AgentsLayout,
});

/** Layout only — child pages (index, team, payouts, …) render via Outlet. */
function AgentsLayout() {
  return <Outlet />;
}
