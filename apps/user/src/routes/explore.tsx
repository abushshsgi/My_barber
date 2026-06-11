import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { useAudience } from "@/hooks/use-audience";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { useUserAgeGroup } from "@/hooks/use-me";
import { AGE_GROUP_LABELS_UZ } from "@/lib/age-groups";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Trend uslublar — mysaloon.uz" }] }),
  component: ExplorePage,
});

function ExplorePage() {
  const { t } = useTranslation();
  const { audience } = useAudience();
  const ageGroup = useUserAgeGroup();
  const { data: list = [], isLoading, isError } = useHairstyles(audience);

  return (
    <div className="pb-8">
      <PageHeader showBack title={t("explorePage.title")} />
      <div className="px-5">
        <AudienceSwitch />
        <p className="mt-3 text-xs text-muted-foreground">
          {ageGroup
            ? `${t("explorePage.subtitle")} · ${AGE_GROUP_LABELS_UZ[ageGroup]}`
            : t("explorePage.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <p className="mt-8 px-5 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : null}

      {isError ? (
        <p className="mt-8 px-5 text-center text-sm text-destructive">{t("common.loadError")}</p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 px-5">
        {list.map((entry) => (
          <Link
            key={entry.id}
            to="/explore/$styleId"
            params={{ styleId: entry.id }}
            className="overflow-hidden active:opacity-90"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
              <img
                src={getHairstyleImageUrl(entry)}
                alt={entry.titleUz}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </div>
            <p className="mt-2 text-sm font-bold leading-tight">{entry.titleUz}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t(`homePage.audience.${entry.audience}`)} · {entry.category}
            </p>
          </Link>
        ))}
      </div>

      {!isLoading && !isError && list.length === 0 ? (
        <p className="mt-8 px-5 text-center text-sm text-muted-foreground">{t("explorePage.empty")}</p>
      ) : null}
    </div>
  );
}
