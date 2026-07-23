import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/hisob-raqam")({
  component: () => <Outlet />,
});
