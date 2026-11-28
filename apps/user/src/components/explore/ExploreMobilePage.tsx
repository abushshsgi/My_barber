import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ScanFace, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { explorePerfMarks, logExplorePerfMeasures } from "@/lib/explore-perf-marks";
import { ExploreStyleGrid } from "@/components/explore/ExploreStyleGrid";
import { ExplorePageToolbar } from "@/components/explore/ExplorePageToolbar";
import { PersonaPicker } from "@/components/PersonaPicker";
import { WomenPersonaPicker } from "@/components/WomenPersonaPicker";
import { PageHeader } from "@/components/PageHeader";
import { useExplorePageData } from "@/hooks/use-explore-page-data";
import { useExplorePersonaList } from "@/hooks/use-explore-personas";
import { EXPLORE_LCP_HERO_SRC } from "@/lib/explore-lcp-static";
import { listReadyExplorePersonas } from "@/lib/explore-personas";
import { MOBILE_STICKY_CONTENT_PADDING_CLASS } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

/** Mobil Explore — katta LCP rasm + ixcham grid (desktop matn layout emas). */
export function ExploreMobilePage() {
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
  const heroRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    explorePerfMarks.exploreRouteRender();
    if (heroRef.current) {
      explorePerfMarks.heroInDom();
      logExplorePerfMeasures();
    }
  }, []);

  return (
    <div className={cn("min-w-0 bg-background", MOBILE_STICKY_CONTENT_PADDING_CLASS)}>
      <div className="relative w-full overflow-hidden bg-[#E8E8E8]">
        <div className="relative mx-auto aspect-[3/4] max-h-[min(52dvh,440px)] w-full max-w-md">
          <img
            ref={heroRef}
            src={EXPLORE_LCP_HERO_SRC}
            alt={t("explorePage.title")}
            width={768}
            height={1024}
            sizes="(max-width: 480px) 100vw, 448px"
            decoding="async"
            fetchPriority="high"
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        </div>
      </div>

      <PageHeader showBack sticky title={t("nav.explore")} backFallback="/ai-style" />
      <div className="px-4 pb-3 pt-1">
        <h1 className="text-xl font-extrabold tracking-tight">{t("explorePage.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("explorePage.subtitle", { count: catalogModelCount })}
        </p>

        <Link
          to="/ai-style"
          preload="intent"
          className="mt-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-foreground p-3 text-background"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-background/10">
            <ScanFace className="size-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-background/80">
              <Sparkles className="size-3" strokeWidth={2.2} />
              Morf AI
            </span>
            <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug">{t("explorePage.aiStyleCtaTitle")}</p>
            <span className="mt-1 inline-block text-xs font-bold text-background/90">{t("explorePage.tryAiStyle")}</span>
          </div>
        </Link>

        <div className="mt-4 space-y-3">
          {audience === "men" ? (
            <PersonaPicker value={personaId} onChange={setPersonaId} compact />
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

      <ExploreStyleGrid
        items={visibleList}
        personaKey={audience === "women" ? womenPersonaId : menPersona}
        isLoading={isLoading}
        isError={isError}
        isRetrying={isRetrying}
        onRetry={retry}
        compact
        className="mt-2 px-4 !grid-cols-2"
      />
    </div>
  );
}