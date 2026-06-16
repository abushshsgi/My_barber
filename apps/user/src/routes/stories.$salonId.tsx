import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/stories/$salonId")({
  head: () => ({
    meta: [{ title: "Story — mysaloon.uz" }],
  }),
  component: StoryViewerPage,
});

function StoryViewerPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col bg-foreground text-background">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link
          to="/stories"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/15 active:opacity-80"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
        </Link>
        <h1 className="text-lg font-bold">{t("storiesPage.title")}</h1>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <EmptyState
          title={t("storiesPage.notFound", { defaultValue: "Story topilmadi" })}
          description={t("storiesPage.emptyHint", {
            defaultValue: "Salon storylari API ulanganda shu yerda ko'rinadi.",
          })}
          className="text-background [&_.text-muted-foreground]:text-background/70"
        />
      </div>
    </div>
  );
}
