import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Film } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/stories")({
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

      <section className="mt-10 px-5">
        <EmptyState
          icon={<Film className="h-7 w-7" />}
          title={t("storiesPage.empty", { defaultValue: "Storylar tez orada" })}
          description={t("storiesPage.emptyHint", {
            defaultValue: "Salon storylari API ulanganda shu yerda ko'rinadi.",
          })}
        />
      </section>
    </div>
  );
}
