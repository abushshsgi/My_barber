import { useTranslation } from "react-i18next";
import { AGE_GROUP_LABELS_UZ } from "@/lib/age-groups";
import type { AgeGroup } from "@/lib/age-groups";
import { cn } from "@/lib/utils";

type Props = {
  styleCount: number;
  ageGroup?: AgeGroup | null;
  className?: string;
};

export function ExplorePageToolbar({ styleCount, ageGroup, className }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        {ageGroup
          ? `${t("explorePage.subtitle")} · ${AGE_GROUP_LABELS_UZ[ageGroup]}`
          : t("explorePage.subtitle")}
      </p>
      {!styleCount ? null : (
        <span className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-bold text-muted-foreground">
          {t("explorePage.styleCount", { count: styleCount })}
        </span>
      )}
    </div>
  );
}
