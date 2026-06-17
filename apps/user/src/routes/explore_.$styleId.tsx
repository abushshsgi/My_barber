import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { CalendarPlus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  HairstylePreviewFrame,
  HairstylePreviewImage,
} from "@/components/hairstyles/HairstylePreviewImage";
import { PageHeader } from "@/components/PageHeader";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyle } from "@/hooks/use-hairstyles";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";
import { cn } from "@/lib/utils";

const BOTTOM_NAV_OFFSET = "calc(68px + env(safe-area-inset-bottom))";
const STICKY_ACTIONS_OFFSET = "calc(68px + env(safe-area-inset-bottom) + 4.25rem)";

export const Route = createFileRoute("/explore_/$styleId")({
  head: () => ({ meta: [{ title: "Uslub — mysaloon.uz" }] }),
  component: ExploreStyleDetailPage,
});

function ExploreStyleDetailPage() {
  const { t } = useTranslation();
  const { styleId } = Route.useParams();
  const { personaId } = useExplorePersona();
  const { data: entry, isLoading, isError } = useHairstyle(styleId, personaId);

  if (isLoading) {
    return (
      <div className="pb-10">
        <PageHeader showBack title={t("explorePage.title")} />
        <p className="mt-8 px-5 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (isError || !entry) {
    throw notFound();
  }

  const imageUrl = getHairstyleImageUrl(entry);

  return (
    <div
      className="pb-[var(--explore-style-actions-offset)] lg:pb-24"
      style={{ ["--explore-style-actions-offset" as string]: STICKY_ACTIONS_OFFSET }}
    >
      <PageHeader showBack title={t("explorePage.tryOnTitle", { style: entry.titleUz })} />

      <div className="px-5">
        <h2 className="text-lg font-bold tracking-tight">{t("aiStylePage.uploadTitle")}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("explorePage.tryOnDesc")}</p>

        <HairstylePreviewFrame className="mt-4">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            <HairstylePreviewImage
              src={imageUrl}
              alt={entry.titleUz}
              variant="card"
              badge={
                <span className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm">
                  {t("explorePage.sampleBadge")}
                </span>
              }
            />
            <div className="border-t border-border/70 bg-surface px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("styleTryOnPage.selectedStyle")}
              </p>
              <p className="mt-0.5 text-base font-bold leading-tight">{entry.titleUz}</p>
            </div>
          </div>
        </HairstylePreviewFrame>

        <div className="mt-4 flex flex-wrap gap-2">
          {entry.faceShapes.map((shape) => (
            <span
              key={shape}
              className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-foreground"
            >
              {t(`aiStylePage.faceShapes.${shape}`)}
            </span>
          ))}
          <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-foreground">
            {t(`aiStylePage.hairTypes.${entry.hairLength}`)}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{entry.descriptionUz}</p>

        {entry.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 z-20 border-t border-border bg-background/95 px-5 pt-3 backdrop-blur-md bottom-[var(--explore-bottom-nav-offset)] lg:bottom-0 lg:left-[240px]"
        style={{
          ["--explore-bottom-nav-offset" as string]: BOTTOM_NAV_OFFSET,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto grid max-w-[480px] grid-cols-2 gap-2 lg:max-w-[720px]">
          <Link
            to="/explore/$styleId/try"
            params={{ styleId: entry.id }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-xs font-bold text-background"
          >
            <Sparkles className="h-4 w-4" />
            {t("explorePage.tryOnMe")}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background py-3.5 text-xs font-bold text-foreground"
          >
            <CalendarPlus className="h-4 w-4" />
            {t("explorePage.findSalon")}
          </Link>
        </div>
      </div>
    </div>
  );
}
