import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { SalonDesktopPage } from "@/components/desktop/pages/SalonDesktopPage";
import { SalonMobilePage } from "@/components/salon/SalonMobilePage";
import { SalonPageSkeleton } from "@/components/salon/SalonPageSkeleton";
import { useFavorites } from "@/hooks/use-favorites";
import { SalonShareSheet } from "@/components/salon/SalonShareSheet";
import { useShareSalon } from "@/hooks/use-share-salon";
import { useSalonPage } from "@/hooks/use-salon-page";
import { useIsLgUp } from "@/hooks/use-mobile";
import { salonsQueryKey } from "@/hooks/use-salons";
import { fetchSalon, fetchSalonStaff } from "@/lib/api/salons";
import { mapSalonDetail } from "@/lib/mappers/salon";
import { buildSalonHeadMeta, fetchSalonSeoMeta } from "@/lib/salon-seo.server";

export const Route = createFileRoute("/salon/$id")({
  ssr: true,
  preload: "intent",
  loader: async ({ params, context }) => {
    const { queryClient } = context;
    const detailPromise = queryClient.ensureQueryData({
      queryKey: [...salonsQueryKey, "detail", params.id],
      queryFn: async () => mapSalonDetail(await fetchSalon(params.id)),
      staleTime: 60_000,
    });

    void queryClient.prefetchQuery({
      queryKey: ["salons", params.id, "staff"],
      queryFn: () => fetchSalonStaff(params.id),
      staleTime: 60_000,
    });

    const [seo] = await Promise.all([fetchSalonSeoMeta(params.id), detailPromise]);
    return { seo };
  },
  head: ({ loaderData, params }) => buildSalonHeadMeta(params.id, loaderData?.seo ?? null),
  component: SalonPage,
});

function SalonPage() {
  const { id } = useParams({ from: "/salon/$id" });
  const { salon, isLoading, reviewsAreMock } = useSalonPage(id);
  const { isFav, toggle, isPending } = useFavorites();
  const { openShare, shareOpen, setShareOpen, shareSalon } = useShareSalon(salon ?? undefined);
  const isLgUp = useIsLgUp();
  // SSR + hydration bir xil skeleton; client mount dan keyin haqiqiy UI.
  // DesktopPageSplit / ClientOnly aralashmasi refreshda #423 oq ekranga olib kelardi.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || isLoading || !salon) {
    return <SalonPageSkeleton />;
  }

  const pageProps = {
    salon,
    fav: isFav(salon.id),
    onToggleFav: () => toggle(salon.id),
    onShare: openShare,
    favPending: isPending,
    reviewsAreMock,
  };

  return (
    <>
      {isLgUp ? <SalonDesktopPage {...pageProps} /> : <SalonMobilePage {...pageProps} />}
      {shareSalon ? (
        <SalonShareSheet open={shareOpen} onOpenChange={setShareOpen} salon={shareSalon} />
      ) : null}
    </>
  );
}
