import { useTranslation } from "react-i18next";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { ExploreStyleGrid } from "@/components/explore/ExploreStyleGrid";
import { ExplorePageToolbar } from "@/components/explore/ExplorePageToolbar";
import { MorfAiExploreCard } from "@/components/explore/MorfAiExploreCard";
import { PersonaPicker } from "@/components/PersonaPicker";
import { WomenPersonaPicker } from "@/components/WomenPersonaPicker";
import { useExplorePageData } from "@/hooks/use-explore-page-data";
import { useExplorePersonaList } from "@/hooks/use-explore-personas";
import { listReadyExplorePersonas } from "@/lib/explore-personas";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import { cn } from "@/lib/utils";

/** Desktop Explore — bento: Morf AI panel + modelllar + uslub grid. */
export function ExploreDesktopPage() {
  const { t } = useTranslation();
  const {
    audience,
    ageGroup,
    personaId,
    setPersonaId,
    menPersona,
    womenPersonas,
    womenPersonaId,
    setWomenPersonaId,
    visibleList,
    isLoading,
    isError,
    isRetrying,
    retry,
  } = useExplorePageData();
  const personaList = useExplorePersonaList();
  const readyCount = personaList.personas.length || listReadyExplorePersonas().length;
  const catalogModelCount = listReadyExplorePersonas().length;

  return (
    <div className={cn("w-full min-w-0 pb-8 max-lg:pb-[var(--mobile-dock)]", DESKTOP_BAZAAR_INSET)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start xl:gap-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MysaloonLogo size="xs" className="opacity-70" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
              · {t("nav.explore")}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl xl:text-[2.75rem]">
            {t("explorePage.title")}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {t("explorePage.desktopDesc")}
          </p>

          <div className="mt-6 space-y-4">
            {audience === "men" ? (
              <PersonaPicker value={personaId} onChange={setPersonaId} />
            ) : audience === "women" ? (
              <WomenPersonaPicker
                personas={womenPersonas}
                value={womenPersonaId}
                onChange={setWomenPersonaId}
              />
            ) : null}
            <ExplorePageToolbar
              styleCount={visibleList.length}
              modelCount={catalogModelCount}
              ageGroup={ageGroup}
            />
            {catalogModelCount !== readyCount ? (
              <p className="text-xs text-muted-foreground">
                {t("explorePage.subtitleModelNote", { shown: readyCount, count: catalogModelCount })}
              </p>
            ) : null}
          </div>
        </div>

        <MorfAiExploreCard className="lg:sticky lg:top-[5.25rem]" />
      </div>

      <ExploreStyleGrid
        items={visibleList}
        personaKey={audience === "women" ? womenPersonaId : menPersona}
        isLoading={isLoading}
        isError={isError}
        isRetrying={isRetrying}
        onRetry={retry}
        className="mt-10 !grid-cols-2 sm:!grid-cols-3 lg:!grid-cols-3 xl:!grid-cols-4 2xl:!grid-cols-5"
      />
    </div>
  );
}

export { MorfAiExploreCard } from "@/components/explore/MorfAiExploreCard";