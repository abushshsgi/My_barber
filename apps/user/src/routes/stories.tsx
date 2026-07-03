import { createFileRoute } from "@tanstack/react-router";
import { Film } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileListPage } from "@/components/mobile/MobileListPage";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/stories")({
  head: () => ({
    meta: [
      { title: "Storylar — mysaloon.uz" },
      { name: "description", content: "Salonlardan qisqa storylar va yangiliklar." },
    ],
  }),
  component: StoriesHubPage,
});

function StoriesHubPage() {
  const { t } = useTranslation();

  return (
    <MobileListPage title={t("storiesPage.title")} subtitle={t("storiesPage.subtitle")}>
      <EmptyState
        icon={<Film className="h-7 w-7" />}
        title={t("storiesPage.empty", { defaultValue: "Storylar tez orada" })}
        description={t("storiesPage.emptyHint", {
          defaultValue: "Salon storylari API ulanganda shu yerda ko'rinadi.",
        })}
      />
    </MobileListPage>
  );
}
