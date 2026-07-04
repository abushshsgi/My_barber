import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/account/activity")({
  beforeLoad: () => {
    throw redirect({ to: "/profile", replace: true });
  },
  head: () => ({ meta: [{ title: "Profil — mysaloon.uz" }] }),
});
