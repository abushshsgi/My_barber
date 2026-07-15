import { createFileRoute, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { StyleTryOnFlow } from "@/components/style-try-on/StyleTryOnFlow";
import { useStyleTryOnFlow } from "@/components/style-try-on/useStyleTryOnFlow";
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
  const { data: entry, isLoading, isError } = useHairstyle(styleId, personaId);
  const flow = useStyleTryOnFlow({ styleId, personaId });

  if (isLoading) {
    return (
      <div className="pb-10">
        <PageHeader showBack sticky title={t("styleTryOnPage.loadingTitle")} />
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
        <PageHeader showBack sticky title={t("styleTryOnPage.title", { style: entry.titleUz })} />
      ) : null}
      <StyleTryOnFlow flow={flow} entry={entry} />
    </div>
  );
}
