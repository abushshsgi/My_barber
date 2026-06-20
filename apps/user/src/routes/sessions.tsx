import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SettingsSessionsPanel } from "@/components/settings/panels/SettingsSessionsPanel";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/sessions")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({ meta: [{ title: "Faol sessiyalar — mysaloon.uz" }] }),
  component: SessionsPage,
});

function SessionsPage() {
  const { t } = useTranslation();
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/settings?section=security");

  return (
    <ProfileSubpageLayout
      title={t("sessions.title", { defaultValue: "Faol sessiyalar" })}
      subtitle={t("sessions.subtitle", {
        defaultValue: "Hisobingiz qaysi qurilmalardan ochilganini ko'ring va boshqaring.",
      })}
      backTo={backTo}
    >
      <SettingsSessionsPanel />
    </ProfileSubpageLayout>
  );
}
