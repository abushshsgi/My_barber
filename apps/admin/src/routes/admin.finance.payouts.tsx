import { createFileRoute, redirect } from "@tanstack/react-router";

/** Eski Moliya → To'lovlar yo'li — yangi Payout layoutga. */
export const Route = createFileRoute("/admin/finance/payouts")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/payouts" });
  },
});
