import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ExploreDesktopPage } from "@/components/desktop/pages/ExploreDesktopPage";
import { ExploreAiStyleBanner, ExploreStyleGrid } from "@/components/explore/ExploreStyleGrid";
import { ExplorePageToolbar } from "@/components/explore/ExplorePageToolbar";
import { PageHeader } from "@/components/PageHeader";
import { PersonaPicker } from "@/components/PersonaPicker";
import { useExplorePageData } from "@/hooks/use-explore-page-data";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Trend uslublar — mysaloon.uz" }] }),
  component: ExplorePage,
});

function ExploreMobile() {
  const { t } = useTranslation();
  const {
    audience,
    ageGroup,
    personaId,
    setPersonaId,
    menPersona,
    visibleList,
    isLoading,
    isError,
  } = useExplorePageData();

  return (
    <div className="pb-8">
      <PageHeader showBack title={t("explorePage.title")} />
      <div className="px-5">
        {audience === "men" ? <PersonaPicker value={personaId} onChange={setPersonaId} /> : null}
        <ExplorePageToolbar
          styleCount={visibleList.length}
          ageGroup={ageGroup}
          className="mt-3"
        />
        <ExploreAiStyleBanner className="mt-4" />
      </div>

      <ExploreStyleGrid
        items={visibleList}
        personaKey={menPersona}
        isLoading={isLoading}
        isError={isError}
        compact
        className="mt-5 px-5"
      />
    </div>
  );
}

function ExplorePage() {
  return <DesktopPageSplit mobile={<ExploreMobile />} desktop={<ExploreDesktopPage />} />;
}
