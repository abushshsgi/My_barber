import { useTranslation } from "react-i18next";
import type { AgeGroup } from "@/lib/age-groups";
import { cn } from "@/lib/utils";

type Props = {
  styleCount: number;
  modelCount: number;
  ageGroup?: AgeGroup | null;
  className?: string;
};

const AGE_GROUP_KEYS: Record<AgeGroup, string> = {
  kids: "explorePage.ageGroups.kids",
  teen: "explorePage.ageGroups.teen",
  young: "explorePage.ageGroups.young",
  adult: "explorePage.ageGroups.adult",
  mature: "explorePage.ageGroups.mature",
};

export function ExplorePageToolbar({ styleCount, modelCount, ageGroup, className }: Props) {
  const { t } = useTranslation();
  const subtitle = t("explorePage.subtitle", { count: modelCount });
  const ageSuffix = ageGroup ? t(AGE_GROUP_KEYS[ageGroup]) : null;

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        {ageSuffix ? `${subtitle} · ${ageSuffix}` : subtitle}
      </p>
      {!styleCount ? null : (
        <span className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-bold text-muted-foreground">
          {t("explorePage.styleCount", { count: styleCount })}
        </span>
      )}
    </div>
  );
}
