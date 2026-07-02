import { createFileRoute, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { SalonDesktopPage } from "@/components/desktop/pages/SalonDesktopPage";
import { SalonMobilePage } from "@/components/salon/SalonMobilePage";
import { useFavorites } from "@/hooks/use-favorites";
import { SalonShareSheet } from "@/components/salon/SalonShareSheet";
import { useShareSalon } from "@/hooks/use-share-salon";
import { useSalonPage } from "@/hooks/use-salon-page";
import { salonsQueryKey } from "@/hooks/use-salons";
import { fetchSalon } from "@/lib/api/salons";
import { mapSalonDetail } from "@/lib/mappers/salon";
import { buildSalonHeadMeta, fetchSalonSeoMeta } from "@/lib/salon-seo.server";

export const Route = createFileRoute("/salon/$id")({
  ssr: true,
  preload: false,
  loader: async ({ params, context }) => {
    const { queryClient } = context;
    const [seo] = await Promise.all([
      fetchSalonSeoMeta(params.id),
      queryClient.ensureQueryData({
        queryKey: [...salonsQueryKey, "detail", params.id],
        queryFn: async () => mapSalonDetail(await fetchSalon(params.id)),
        staleTime: 60_000,
      }),
    ]);
    return { seo };
  },
  head: ({ loaderData, params }) => buildSalonHeadMeta(params.id, loaderData?.seo ?? null),
  component: SalonPage,
});

function SalonPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/salon/$id" });
  const { salon, isLoading, reviewsAreMock } = useSalonPage(id);
  const { isFav, toggle, isPending } = useFavorites();
  const { openShare, shareOpen, setShareOpen, shareSalon } = useShareSalon(salon ?? undefined);

  if (isLoading || !salon) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const fav = isFav(salon.id);
  const toggleFav = () => toggle(salon.id);
  const pageProps = {
    salon,
    fav,
    onToggleFav: toggleFav,
    onShare: openShare,
    favPending: isPending,
    reviewsAreMock,
  };

  return (
    <>
      <DesktopPageSplit
        mobile={<SalonMobilePage {...pageProps} />}
        desktop={<SalonDesktopPage {...pageProps} />}
      />
      {shareSalon ? (
        <SalonShareSheet open={shareOpen} onOpenChange={setShareOpen} salon={shareSalon} />
      ) : null}
    </>
  );
}
