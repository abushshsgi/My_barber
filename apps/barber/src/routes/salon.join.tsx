import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * `/salon/join/*` — child (`/salon/join/` index va `/salon/join/setup`) sahifalari
 * uchun layout. Outlet majburiy, aks holda nested route render bo‘lmaydi.
 */
export const Route = createFileRoute("/salon/join")({
  component: SalonJoinLayout,
});

function SalonJoinLayout() {
  return <Outlet />;
}
