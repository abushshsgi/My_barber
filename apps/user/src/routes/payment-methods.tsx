import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/payment-methods")({
  beforeLoad: () => {
    throw redirect({ to: "/wallet", search: { section: "payments" } });
  },
});
