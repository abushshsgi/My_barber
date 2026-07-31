import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ScanFace, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { ExploreStyleGrid } from "@/components/explore/ExploreStyleGrid";
import { ExplorePageToolbar } from "@/components/explore/ExplorePageToolbar";
import { PersonaPicker } from "@/components/PersonaPicker";
import { useExplorePageData } from "@/hooks/use-explore-page-data";
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
    visibleList,
    isLoading,
    isError,
    isRetrying,
    retry,
  } = useExplorePageData();

  return (
    <div className={cn("w-full min-w-0 pb-8", DESKTOP_BAZAAR_INSET)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start xl:gap-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MysaloonLogo size="xs" className="opacity-70" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
              · {t("nav.explore")}
            </span>
          </div>
          <h1 className="mt-2 text-[2.35rem] font-extrabold leading-[1.1] tracking-tight xl:text-[2.75rem]">
            {t("explorePage.title")}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {t("explorePage.desktopDesc")}
          </p>

          <div className="mt-6 space-y-4">
            {audience === "men" ? (
              <PersonaPicker value={personaId} onChange={setPersonaId} />
            ) : null}
            <ExplorePageToolbar styleCount={visibleList.length} ageGroup={ageGroup} />
          </div>
        </div>

        <MorfAiExploreCard className="lg:sticky lg:top-[5.25rem]" />
      </div>

      <ExploreStyleGrid
        items={visibleList}
        personaKey={menPersona}
        isLoading={isLoading}
        isError={isError}
        isRetrying={isRetrying}
        onRetry={retry}
        className="mt-10 !grid-cols-2 sm:!grid-cols-3 lg:!grid-cols-3 xl:!grid-cols-4 2xl:!grid-cols-5"
      />
    </div>
  );
}

export function MorfAiExploreCard({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Link
      to="/ai-style"
      preload="intent"
      className={cn(
        "group relative flex min-h-[220px] cursor-pointer flex-col justify-between overflow-hidden rounded-[1.75rem] bg-foreground p-6 text-background shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)] transition-[box-shadow,filter] duration-200 hover:brightness-110 hover:shadow-[0_28px_60px_-24px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-background/10 blur-2xl transition group-hover:bg-background/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-6 size-48 rounded-full bg-background/5 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-background/20 bg-background/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
          <Sparkles className="size-3.5" strokeWidth={2.2} />
          Morf AI
        </span>
        <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight">
          {t("explorePage.aiStyleCtaTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-background/70">
          {t("explorePage.aiStyleCtaDesc")}
        </p>
      </div>

      <div className="relative mt-8 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-2xl bg-background px-4 py-3 text-sm font-bold text-foreground transition group-hover:bg-background/95">
          <ScanFace className="size-4" strokeWidth={2.2} />
          {t("explorePage.tryAiStyle")}
        </span>
        <span className="grid size-11 place-items-center rounded-2xl border border-background/25 bg-background/10 transition group-hover:bg-background/20">
          <ArrowUpRight className="size-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
