import { createFileRoute } from "@tanstack/react-router";
import { MorphPersonalShareLanding } from "@/components/ai-style/MorphPersonalShareLanding";
import {
  buildMorphShareHeadMeta,
  fetchMorphShareSeo,
} from "@/lib/morph-share-seo.server";

export const Route = createFileRoute("/morf-ai/share/$shareId")({
  ssr: false,
  loader: async ({ params }) => {
    try {
      const seo = await fetchMorphShareSeo(params.shareId);
      return { seo };
    } catch {
      return { seo: null };
    }
  },
  head: ({ loaderData, params }) =>
    buildMorphShareHeadMeta(params.shareId, loaderData?.seo ?? null),
  component: MorphPersonalSharePage,
});

function MorphPersonalSharePage() {
  const { shareId } = Route.useParams();
  return <MorphPersonalShareLanding shareId={shareId} />;
}
