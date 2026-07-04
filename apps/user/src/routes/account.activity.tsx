import { createFileRoute } from "@tanstack/react-router";
import { AccountHubPage } from "@/components/profile/AccountHubPage";

export const Route = createFileRoute("/account/activity")({
  head: () => ({ meta: [{ title: "Faoliyatim — mysaloon.uz" }] }),
  component: () => <AccountHubPage hubKey="activity" />,
});
