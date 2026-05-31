import { useTranslation } from "react-i18next";
import { userProfile } from "@/lib/mock-data";
import type { AudienceFilter } from "@/hooks/use-audience";

type Props = {
  audience: AudienceFilter;
};

export function ProfileIdentity({ audience }: Props) {
  const { t } = useTranslation();
  const audienceLabel = t(`audience.${audience}`);

  return (
    <div className="px-5">
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-foreground text-2xl font-bold text-background">
          {userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold tracking-tight">{userProfile.name}</h2>
          <p className="mt-0.5 text-xs font-bold text-muted-foreground">{userProfile.phone}</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            {t("profile.preferredAudience")}: {audienceLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
