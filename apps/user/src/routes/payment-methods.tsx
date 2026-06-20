import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SettingsPaymentMethodsPanel } from "@/components/settings/panels/SettingsPaymentMethodsPanel";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/payment-methods")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({ meta: [{ title: "To'lov usullari — mysaloon.uz" }] }),
  component: PaymentMethodsPage,
});

function PaymentMethodsPage() {
  const { t } = useTranslation();
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/settings?section=payments");

  return (
    <ProfileSubpageLayout title={t("paymentMethods.title")} backTo={backTo}>
      <SettingsPaymentMethodsPanel />
    </ProfileSubpageLayout>
  );
}
