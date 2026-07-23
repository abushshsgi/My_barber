import { createFileRoute } from "@tanstack/react-router";
import { MorphLookShareLanding } from "@/components/ai-style/MorphLookShareLanding";
import {
  buildMorphLookHeadMeta,
  fetchMorphLookSeo,
} from "@/lib/morph-share-seo.server";

export const Route = createFileRoute("/morf-ai/look/$styleId")({
  loader: async ({ params }) => {
    const seo = await fetchMorphLookSeo(params.styleId);
    return { seo };
  },
  head: ({ loaderData, params }) =>
    buildMorphLookHeadMeta(params.styleId, loaderData?.seo ?? null),
  component: MorphLookSharePage,
});

function MorphLookSharePage() {
  const { styleId } = Route.useParams();
  return <MorphLookShareLanding styleId={styleId} />;
}
