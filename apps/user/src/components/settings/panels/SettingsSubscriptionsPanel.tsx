import { Repeat } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";

export function SettingsSubscriptionsPanel() {
  const { t } = useTranslation();

  return (
    <div className="mt-4">
      <p className="mb-4 text-sm text-muted-foreground">{t("subscriptions.subtitle")}</p>
      <EmptyState
        icon={<Repeat className="h-7 w-7" />}
        title={t("subscriptions.empty", { defaultValue: "Obunalar tez orada" })}
        description={t("subscriptions.emptyHint", {
          defaultValue: "Obuna rejalar API ulanganda shu yerda ko'rinadi.",
        })}
      />
    </div>
  );
}
