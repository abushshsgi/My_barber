import { useTranslation } from "react-i18next";
import { ExploreAiStyleBanner, ExploreStyleGrid } from "@/components/explore/ExploreStyleGrid";
import { ExplorePageToolbar } from "@/components/explore/ExplorePageToolbar";
import { PersonaPicker } from "@/components/PersonaPicker";
import { DesktopPageHeader } from "@/components/desktop/ui/DesktopPageHeader";
import { useExplorePageData } from "@/hooks/use-explore-page-data";

export function ExploreDesktopPage() {
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
    <div>
      <DesktopPageHeader
        title={t("explorePage.title")}
        description={t("explorePage.desktopDesc")}
      />

      <div className="mt-6 space-y-4">
        {audience === "men" ? <PersonaPicker value={personaId} onChange={setPersonaId} /> : null}
        <ExplorePageToolbar styleCount={visibleList.length} ageGroup={ageGroup} />
        <ExploreAiStyleBanner />
      </div>

      <ExploreStyleGrid
        items={visibleList}
        personaKey={menPersona}
        isLoading={isLoading}
        isError={isError}
        className="mt-8"
      />
    </div>
  );
}
