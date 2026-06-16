import { createFileRoute } from "@tanstack/react-router";
import { Repeat } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({ meta: [{ title: "Obunalar — mysaloon.uz" }] }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { t } = useTranslation();

  return (
    <ProfileSubpageLayout
      title={t("subscriptions.title")}
      subtitle={t("subscriptions.subtitle")}
    >
      <EmptyState
        icon={<Repeat className="h-7 w-7" />}
        title={t("subscriptions.empty", { defaultValue: "Obunalar tez orada" })}
        description={t("subscriptions.emptyHint", {
          defaultValue: "Obuna rejalar API ulanganda shu yerda ko'rinadi.",
        })}
      />
    </ProfileSubpageLayout>
  );
}
