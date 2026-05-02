import { createFileRoute, Outlet } from "@tanstack/react-router";

/** `/salon/join/*` — child (`setup`, index) uchun `<Outlet />` majburiy. */
export const Route = createFileRoute("/salon/join")({
  component: SalonJoinLayout,
});

function SalonJoinLayout() {
  return <Outlet />;
}
