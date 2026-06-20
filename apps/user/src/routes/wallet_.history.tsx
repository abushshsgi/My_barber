import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/wallet_/history")({
  beforeLoad: () => {
    throw redirect({ to: "/wallet", search: { section: "transactions" } });
  },
});
