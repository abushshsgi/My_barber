import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { savedAddresses } from "@/lib/mock-data";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { cn } from "@/lib/utils";

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
      <div className="space-y-3">
        {savedAddresses.map((a) => (
          <ProfileSubpageCard
            key={a.id}
            className={cn(a.isDefault && "border-foreground bg-surface/50")}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{a.label}</p>
                  {a.isDefault && (
                    <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase text-background">
                      {t("addresses.default")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm">{a.line}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.district}</p>
              </div>
            </div>
          </ProfileSubpageCard>
        ))}

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background py-4 text-sm font-bold text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
          {t("addresses.add")}
        </button>
      </div>
    </ProfileSubpageLayout>
  );
}
