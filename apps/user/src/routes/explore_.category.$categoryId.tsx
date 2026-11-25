import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ExploreStyleGrid } from "@/components/explore/ExploreStyleGrid";
import { PageHeader } from "@/components/PageHeader";
import { useHairstyles } from "@/hooks/use-hairstyles";
import {
  EXPLORE_CATEGORIES,
  type ExploreCategoryId,
} from "@/seo/hairstyles/categories";
import { filterHairstyles, mapApiHairstyle } from "@/lib/hairstyles/catalog";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/explore_/category/$categoryId")({
  head: ({ params }) => ({
    meta: [{ title: `${params.categoryId} — soch katalogi | mysaloon.uz` }],
  }),
  component: ExploreCategoryPage,
});

function ExploreCategoryPage() {
  const { categoryId } = Route.useParams();
  const def = EXPLORE_CATEGORIES.find((c) => c.id === categoryId);
  if (!def) throw notFound();

  const { data, isLoading } = useHairstyles();
  const entries = useMemo(() => {
    const rows = (data ?? []).map(mapApiHairstyle);
    return filterHairstyles(rows).filter((e) =>
      def.match({
        id: e.id,
        slug: e.slug,
        title: e.title,
        title_uz: e.titleUz,
        audience: e.audience,
        hair_length: e.hairLength,
        image_url: e.imageUrl,
        description_uz: e.descriptionUz,
        tags: e.tags,
      }),
    );
  }, [data, def]);

  useEffect(() => {
    trackEvent(
      "organic_landing_view",
      { surface: "explore_category", category: categoryId as ExploreCategoryId },
      { dedupeKey: `cat-${categoryId}` },
    );
  }, [categoryId]);

  const copy = def.copy.uz;

  const body = (
    <div className="px-4 pb-8 pt-2 md:px-0">
      <PageHeader title={copy.h1} showBack sticky backFallback="/explore" />
      <p className="mt-2 text-sm text-muted-foreground">{copy.intro}</p>
      <nav className="mt-3 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/explore" className="hover:text-foreground">
          Katalog
        </Link>
        <span className="px-1">/</span>
        <span>{copy.h1}</span>
      </nav>
      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Yuklanmoqda…</p>
      ) : (
        <div className="mt-6">
          <ExploreStyleGrid entries={entries} />
        </div>
      )}
    </div>
  );

  return <DesktopPageSplit mobile={body} desktop={<div className="max-w-5xl">{body}</div>} />;
}