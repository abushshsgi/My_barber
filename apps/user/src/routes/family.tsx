import { createFileRoute } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { EmptyState } from "@/components/EmptyState";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/family")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({ meta: [{ title: "Oilaviy profil — mysaloon.uz" }] }),
  component: FamilyPage,
});

function FamilyPage() {
  const { t } = useTranslation();
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/settings?section=family");

  return (
    <ProfileSubpageLayout
      title={t("family.title")}
      subtitle={t("family.subtitle")}
      backTo={backTo}
    >
      <EmptyState
        icon={<Users className="h-7 w-7" />}
        title={t("family.empty", { defaultValue: "Oilaviy a'zolar yo'q" })}
        description={t("family.emptyHint", {
          defaultValue: "Oilaviy profil API ulanganda shu yerda ko'rinadi.",
        })}
      />

      <ProfileSubpageCard className="mt-4">
        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-bold text-muted-foreground opacity-60"
        >
          <Plus className="h-4 w-4" />
          {t("family.addMember")}
        </button>
      </ProfileSubpageCard>
    </ProfileSubpageLayout>
  );
}
