import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { PageHeader } from "@/components/PageHeader";
import { resolveFetchBase } from "@/lib/api/base-url";
import { trackEvent } from "@/lib/analytics";
import { guideIndexHead } from "@/lib/guide-seo.server";

export const Route = createFileRoute("/guides")({
  head: () => guideIndexHead("uz"),
  component: GuidesIndexPage,
});

type GuideRow = {
  slug: string;
  title: string;
  excerpt: string;
  category?: string;
};

async function fetchPublishedGuides(): Promise<GuideRow[]> {
  const res = await fetch(`${resolveFetchBase("")}/api/v1/content/articles/?locale=uz`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  return (await res.json()) as GuideRow[];
}

function GuidesIndexPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["guides", "published"],
    queryFn: fetchPublishedGuides,
    staleTime: 60_000,
  });

  useEffect(() => {
    trackEvent("organic_landing_view", { surface: "guides_index" }, { dedupeKey: "guides" });
  }, []);

  const body = (
    <div className="px-4 pb-10 pt-2 md:px-0">
      <PageHeader title="Qo'llanmalar" showBack sticky backFallback="/" />
      <p className="mt-2 text-sm text-muted-foreground">
        Soch parvarishi, Morf AI va MySaloon xizmatlari bo'yicha maqolalar.
      </p>
      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Yuklanmoqda…</p>
      ) : !data?.length ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nashr etilgan maqolalar tez orada qo'shiladi. Admin draftlarni tasdiqlagach bu yerda paydo
          bo'ladi.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {data.map((row) => (
            <li key={row.slug} className="rounded-2xl border border-border bg-surface p-4">
              <Link
                to="/guides/$slug"
                params={{ slug: row.slug }}
                className="text-base font-semibold text-foreground hover:underline"
              >
                {row.title}
              </Link>
              {row.excerpt ? (
                <p className="mt-1 text-sm text-muted-foreground">{row.excerpt}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return <DesktopPageSplit mobile={body} desktop={<div className="max-w-3xl">{body}</div>} />;
}
