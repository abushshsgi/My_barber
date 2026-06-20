import { createFileRoute } from "@tanstack/react-router";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SettingsSupportPanel } from "@/components/settings/panels/SettingsSupportPanel";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/support")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Yordam — mysaloon.uz" },
      { name: "description", content: "mysaloon.uz yordam markazi va tez-tez so'raladigan savollar." },
    ],
  }),
  component: Support,
});

function Support() {
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/settings?section=help");

  return (
    <ProfileSubpageLayout title="Yordam" backTo={backTo}>
      <SettingsSupportPanel />
    </ProfileSubpageLayout>
  );
}
