import { createFileRoute } from "@tanstack/react-router";
import { AccountHubPage } from "@/components/profile/AccountHubPage";

export const Route = createFileRoute("/account/preferences")({
  head: () => ({ meta: [{ title: "Sozlamalar va yordam — mysaloon.uz" }] }),
  component: () => <AccountHubPage hubKey="preferences" />,
});
