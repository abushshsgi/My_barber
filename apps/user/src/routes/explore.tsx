import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ExploreDesktopPage } from "@/components/desktop/pages/ExploreDesktopPage";
import { ExploreStyleGrid } from "@/components/explore/ExploreStyleGrid";
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
    personaId,
    setPersonaId,
    menPersona,
    visibleList,
    isLoading,
    isError,
  } = useExplorePageData();

  return (
    <div className="min-h-full min-w-0">
      <PageHeader showBack title={t("explorePage.title")} transparent />
      <div className="px-2 pb-3">
        {audience === "men" ? (
          <PersonaPicker value={personaId} onChange={setPersonaId} compact />
        ) : null}
        <ExploreStyleGrid
          items={visibleList}
          personaKey={menPersona}
          isLoading={isLoading}
          isError={isError}
          compact
          className={audience === "men" ? "mt-3" : "mt-1"}
        />
      </div>
    </div>
  );
}

function ExplorePage() {
  return <DesktopPageSplit mobile={<ExploreMobile />} desktop={<ExploreDesktopPage />} />;
}
