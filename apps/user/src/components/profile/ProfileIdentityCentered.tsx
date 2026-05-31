import { useTranslation } from "react-i18next";
import { userProfile } from "@/lib/mock-data";
import type { AudienceFilter } from "@/hooks/use-audience";

type Props = {
  audience: AudienceFilter;
};

/** Markazlashtirilgan avatar — iOS / Telegram uslubi. */
export function ProfileIdentityCentered({ audience }: Props) {
  const { t } = useTranslation();
  const audienceLabel = t(`audience.${audience}`);
  const initials = userProfile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center px-5 pt-2 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-foreground text-3xl font-bold text-background">
        {initials}
      </div>
      <h2 className="mt-4 text-xl font-bold tracking-tight">{userProfile.name}</h2>
      <p className="mt-1 text-xs font-bold text-muted-foreground">{userProfile.phone}</p>
      <span className="mt-3 inline-flex rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-muted-foreground">
        {audienceLabel}
      </span>
    </div>
  );
}
