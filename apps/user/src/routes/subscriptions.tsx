import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SettingsSubscriptionsPanel } from "@/components/settings/panels/SettingsSubscriptionsPanel";
import { parseSubscriptionsSearch } from "@/lib/subscriptions-nav";

export const Route = createFileRoute("/subscriptions")({
  validateSearch: (search: Record<string, unknown>) => parseSubscriptionsSearch(search),
  ssr: false,
  head: () => ({
    meta: [
      { title: "Obuna — mysaloon.uz" },
      { name: "description", content: "Morf AI obuna tariflari. To‘lov Payme orqali." },
    ],
  }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const backTo = search.returnTo || "/profile";

  return (
    <ProfileSubpageLayout
      title={t("subscriptions.title", { defaultValue: "Obunalar" })}
      subtitle={t("subscriptions.subtitle", {
        defaultValue: "Morf AI uchun tarif tanlang — to‘lov Payme orqali.",
      })}
      backTo={backTo}
      strictBack
      flush
    >
      <div className="px-4 pb-8 pt-2">
        <SettingsSubscriptionsPanel />
      </div>
    </ProfileSubpageLayout>
  );
}
