import { createFileRoute } from "@tanstack/react-router";
import { AccountHubPage } from "@/components/profile/AccountHubPage";

export const Route = createFileRoute("/account/payments")({
  head: () => ({ meta: [{ title: "To'lov va bonus — mysaloon.uz" }] }),
  component: () => <AccountHubPage hubKey="payments" />,
});
