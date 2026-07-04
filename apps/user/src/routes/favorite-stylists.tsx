import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/favorite-stylists")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/favorites",
      search: {
        tab: "stylists",
        ...(typeof search.backTo === "string" ? { backTo: search.backTo } : {}),
      },
    });
  },
});
