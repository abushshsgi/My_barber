import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { CalendarPlus, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyle } from "@/hooks/use-hairstyles";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";
import { cn } from "@/lib/utils";

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

  return (
    <div className="pb-10">
      <PageHeader showBack title={entry.titleUz} />

      <div className="px-5">
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-surface">
          <img
            src={getHairstyleImageUrl(entry)}
            alt={entry.titleUz}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm">
            {t("explorePage.sampleBadge")}
          </span>
        </div>

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

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{entry.descriptionUz}</p>

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

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link
            to="/ai-style"
            search={{ styleId: entry.id }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-xs font-bold text-background"
          >
            <Wand2 className="h-4 w-4" />
            {t("explorePage.tryAiStyle")}
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
