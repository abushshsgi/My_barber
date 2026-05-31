import { createFileRoute } from "@tanstack/react-router";
import { AccountHubPage } from "@/components/profile/AccountHubPage";

export const Route = createFileRoute("/account/household")({
  head: () => ({ meta: [{ title: "Oila va manzil — mysaloon.uz" }] }),
  component: () => <AccountHubPage hubKey="household" />,
});
