import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { MorphLimitUpsell } from "@/components/ai-style/MorphLimitUpsell";
import { StyleTryOnFlow } from "@/components/style-try-on/StyleTryOnFlow";
import { useStyleTryOnFlow } from "@/components/style-try-on/useStyleTryOnFlow";
import { useMorphLimitGate } from "@/hooks/use-morph-limit-gate";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyle } from "@/hooks/use-hairstyles";

export const Route = createFileRoute("/explore_/$styleId_/try")({
  head: () => ({ meta: [{ title: "Uslubni sinash — mysaloon.uz" }] }),
  component: ExploreStyleTryPage,
});

function ExploreStyleTryPage() {
  const { t } = useTranslation();
  const { styleId } = Route.useParams();
  const { personaId } = useExplorePersona();
  const limitGate = useMorphLimitGate();
  const beforeTryOn = useCallback(
    (source: "auto" | "manual") => limitGate.ensureTryOn({ silent: source === "auto" }),
    [limitGate],
  );
  const onPlanLimit = useCallback(() => void limitGate.openFromApiLimit("tryon"), [limitGate]);
  const { data: entry, isLoading, isError } = useHairstyle(styleId, personaId);
  const flow = useStyleTryOnFlow({
    styleId,
    styleTitle: entry?.titleUz,
    personaId,
    beforeTryOn,
    onPlanLimit,
    onTryOnSuccess: limitGate.invalidateUsage,
  });

  if (isLoading) {
    return (
      <div className="pb-10">
        <PageHeader
          showBack
          sticky
          title={t("styleTryOnPage.loadingTitle")}
          backFallback={`/explore/${styleId}`}
        />
        <p className="mt-8 px-5 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (isError || !entry) {
    throw notFound();
  }

  return (
    <div>
      {!flow.tryOnPreview && !flow.photo ? (
        <PageHeader
          showBack
          sticky
          title={t("styleTryOnPage.title", { style: entry.titleUz })}
          backFallback={`/explore/${styleId}`}
        />
      ) : null}
      <StyleTryOnFlow flow={flow} entry={entry} />
      <MorphLimitUpsell
        open={limitGate.open}
        onOpenChange={limitGate.setOpen}
        kind={limitGate.kind}
        me={limitGate.me}
      />
    </div>
  );
}
