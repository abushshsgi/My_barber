import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/addresses")({
  head: () => ({ meta: [{ title: "Manzillarim — mysaloon.uz" }] }),
  component: AddressesPage,
});

function AddressesPage() {
  const { t } = useTranslation();

  return (
    <ProfileSubpageLayout
      title={t("addresses.title")}
      subtitle={t("addresses.hint")}
    >
      <EmptyState
        icon={<MapPin className="h-7 w-7" />}
        title={t("addresses.empty", { defaultValue: "Saqlangan manzillar yo'q" })}
        description={t("addresses.emptyHint", {
          defaultValue: "Manzillar API ulanganda shu yerda ko'rinadi.",
        })}
      />

      <ProfileSubpageCard className="mt-4">
        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background py-4 text-sm font-bold text-muted-foreground opacity-60"
        >
          <Plus className="h-4 w-4" />
          {t("addresses.add")}
        </button>
      </ProfileSubpageCard>
    </ProfileSubpageLayout>
  );
}
