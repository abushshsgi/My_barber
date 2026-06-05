import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StoryRings } from "@/components/stories/StoryRings";
import { salonStories } from "@/lib/stories-mock";

type StoriesSearch = { start?: string };

export const Route = createFileRoute("/stories")({
  validateSearch: (s: Record<string, unknown>): StoriesSearch => ({
    start: typeof s.start === "string" ? s.start : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Storylar — mysaloon.uz" },
      { name: "description", content: "Salonlardan qisqa storylar va yangiliklar." },
    ],
  }),
  component: StoriesHubPage,
});

function StoriesHubPage() {
  const { t } = useTranslation();
  const { start } = Route.useSearch();

  return (
    <div className="min-h-full bg-background pb-[calc(68px+env(safe-area-inset-bottom)+16px)]">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link
          to="/"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface active:opacity-80"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
        </Link>
        <div>
          <h1 className="text-lg font-bold">{t("storiesPage.title")}</h1>
          <p className="text-[11px] font-medium text-muted-foreground">{t("storiesPage.subtitle")}</p>
        </div>
      </header>

      <section className="mt-6 px-5">
        <StoryRings stories={salonStories} linkTo="viewer" />
      </section>

      <section className="mt-8 space-y-3 px-5">
        <h2 className="text-sm font-bold">{t("storiesPage.allSalons")}</h2>
        {salonStories.map((story) => (
          <Link
            key={story.salonId}
            to="/stories/$salonId"
            params={{ salonId: story.salonId }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 active:scale-[0.99]"
          >
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-sm font-bold text-background"
              style={{
                background: `linear-gradient(135deg, oklch(0.55 0.05 ${(Number(story.salonId) * 70) % 360}), oklch(0.25 0.02 ${(Number(story.salonId) * 70 + 50) % 360}))`,
              }}
            >
              {story.salonName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{story.salonName}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {story.slides.length} {t("storiesPage.slides")} ·{" "}
                {story.unseen ? t("storiesPage.unseen") : t("storiesPage.seen")}
              </p>
            </div>
            {story.unseen && (
              <span className="shrink-0 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold text-background">
                Yangi
              </span>
            )}
          </Link>
        ))}
      </section>

      {start && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-10 flex justify-center px-5">
          <Link
            to="/stories/$salonId"
            params={{ salonId: start }}
            className="pointer-events-auto rounded-full bg-foreground px-5 py-3 text-sm font-bold text-background shadow-lg"
          >
            {t("storiesPage.continueWatching")}
          </Link>
        </div>
      )}
    </div>
  );
}
