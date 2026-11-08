import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  clearPaymeAwaitReturn,
  PaymeCheckoutStatus,
  readStoredPaymeOrder,
} from "@/components/subscriptions/PaymeCheckoutStatus";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";

export const Route = createFileRoute("/subscriptions_/payme")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Payme to‘lov — mysaloon.uz" },
      { name: "description", content: "AI Premium obuna uchun Payme to‘lov holati." },
    ],
  }),
  component: PaymeReturnPage,
});

function PaymeReturnPage() {
  const orderId = typeof window !== "undefined" ? readStoredPaymeOrder() : null;
  useEffect(() => {
    clearPaymeAwaitReturn();
  }, []);
  return (
    <ProfileSubpageLayout
      title="To‘lov"
      backTo="/subscriptions"
      strictBack
    >
      {orderId ? (
        <PaymeCheckoutStatus orderId={orderId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Buyurtma topilmadi. Obuna sahifasidan Payme to'lovini qayta boshlang.
        </p>
      )}
    </ProfileSubpageLayout>
  );
}
