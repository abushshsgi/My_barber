import { createFileRoute } from "@tanstack/react-router";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SettingsPrivacyPanel } from "@/components/settings/panels/SettingsPrivacyPanel";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/privacy")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Maxfiylik — mysaloon.uz" },
      { name: "description", content: "mysaloon.uz maxfiylik siyosati." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/settings?section=privacy");

  return (
    <ProfileSubpageLayout title="Maxfiylik" backTo={backTo}>
      <SettingsPrivacyPanel />
    </ProfileSubpageLayout>
  );
}
