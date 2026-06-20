import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/giftcard")({
  beforeLoad: () => {
    throw redirect({ to: "/wallet", search: { section: "gift" } });
  },
});
