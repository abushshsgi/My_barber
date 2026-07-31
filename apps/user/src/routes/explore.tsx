import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import {
  ExploreDesktopPage,
  MorfAiExploreCard,
} from "@/components/desktop/pages/ExploreDesktopPage";
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
    isRetrying,
    retry,
  } = useExplorePageData();

  return (
    <div className="min-h-full min-w-0">
      <PageHeader showBack sticky title={t("explorePage.title")} />
      <div className="px-2 pb-3">
        <div className="mb-3 px-1">
          <MorfAiExploreCard className="min-h-[180px]" />
        </div>
        {audience === "men" ? (
          <PersonaPicker value={personaId} onChange={setPersonaId} compact />
        ) : null}
        <ExploreStyleGrid
          items={visibleList}
          personaKey={menPersona}
          isLoading={isLoading}
          isError={isError}
          isRetrying={isRetrying}
          onRetry={retry}
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
