import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { familyMembers } from "@/lib/mock-data";
import {
  ProfileSubpageCard,
  ProfileSubpageLayout,
} from "@/components/profile/ProfileSubpageLayout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/family")({
  head: () => ({ meta: [{ title: "Oilaviy profil — mysaloon.uz" }] }),
  component: FamilyPage,
});

function FamilyPage() {
  const { t } = useTranslation();

  return (
    <ProfileSubpageLayout title={t("family.title")} subtitle={t("family.subtitle")}>
      <div className="space-y-3">
        {familyMembers.map((m) => (
          <ProfileSubpageCard key={m.id}>
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{m.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.relation} ·{" "}
                  {t(
                    `audience.${m.audience === "women" ? "women" : m.audience === "men" ? "men" : "all"}`,
                  )}
                </p>
                {m.phone && (
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{m.phone}</p>
                )}
              </div>
            </div>
            {m.relation !== "O'zim" && (
              <Link
                to="/"
                className={cn(
                  "mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-xs font-bold text-background",
                )}
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                {t("family.bookFor", { name: m.name.split(" ")[0] })}
              </Link>
            )}
          </ProfileSubpageCard>
        ))}

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-bold text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
          {t("family.addMember")}
        </button>
      </div>
    </ProfileSubpageLayout>
  );
}
