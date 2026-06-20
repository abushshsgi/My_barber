import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ExploreDesktopPage } from "@/components/desktop/pages/ExploreDesktopPage";
import { PageHeader } from "@/components/PageHeader";
import { resolveAiStyleAudience, useAudience } from "@/hooks/use-audience";
import { PersonaPicker } from "@/components/PersonaPicker";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { useUserAgeGroup } from "@/hooks/use-me";
import { AGE_GROUP_LABELS_UZ } from "@/lib/age-groups";
import { hasPersonaStyleAsset } from "@/lib/explore-personas";
import { getHairstyleDisplayUrl } from "@/lib/hairstyles/catalog";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Trend uslublar — mysaloon.uz" }] }),
  component: ExplorePage,
});

function ExploreMobile() {
  const { t } = useTranslation();
  const { profileDefault } = useAudience();
  const audience = resolveAiStyleAudience(profileDefault, "all");
  const ageGroup = useUserAgeGroup();
  const { personaId, setPersonaId } = useExplorePersona();
  const menPersona = audience === "men" ? personaId : null;
  const { data: list = [], isLoading, isError } = useHairstyles(audience, menPersona);

  const visibleList = useMemo(() => {
    return list.filter((entry) => {
      if (entry.audience !== "men") return true;
      return hasPersonaStyleAsset(personaId, entry.slug);
    });
  }, [list, personaId]);

  return (
    <div className="pb-8">
      <PageHeader showBack title={t("explorePage.title")} />
      <div className="px-5">
        {audience === "men" ? <PersonaPicker value={personaId} onChange={setPersonaId} /> : null}
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
        {visibleList.map((entry) => (
          <Link
            key={`${menPersona ?? "default"}-${entry.id}`}
            to="/explore/$styleId"
            params={{ styleId: entry.id }}
            className="overflow-hidden active:opacity-90"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#E8E8E8]">
              <img
                src={getHairstyleDisplayUrl(entry)}
                alt={entry.titleUz}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-contain object-center"
              />
            </div>
            <p className="mt-2 text-sm font-bold leading-tight">{entry.titleUz}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t(`homePage.audience.${entry.audience}`)} · {entry.category}
            </p>
          </Link>
        ))}
      </div>

      {!isLoading && !isError && visibleList.length === 0 ? (
        <p className="mt-8 px-5 text-center text-sm text-muted-foreground">{t("explorePage.empty")}</p>
      ) : null}
    </div>
  );
}

function ExplorePage() {
  return <DesktopPageSplit mobile={<ExploreMobile />} desktop={<ExploreDesktopPage />} />;
}
