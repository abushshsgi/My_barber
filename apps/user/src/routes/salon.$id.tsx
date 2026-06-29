import { createFileRoute, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SalonDesktopPage } from "@/components/desktop/pages/SalonDesktopPage";
import type { SalonDesktopLayoutId } from "@/components/desktop/pages/salon-layouts/types";
import { SalonMobilePage } from "@/components/salon/SalonMobilePage";
import { useFavorites } from "@/hooks/use-favorites";
import { SalonShareSheet } from "@/components/salon/SalonShareSheet";
import { useShareSalon } from "@/hooks/use-share-salon";
import { useSalonPage } from "@/hooks/use-salon-page";
import { useIsLgUp } from "@/hooks/use-mobile";
import { buildSalonHeadMeta, fetchSalonSeoMeta } from "@/lib/salon-seo.server";

export const Route = createFileRoute("/salon/$id")({
  ssr: true,
  validateSearch: (search: Record<string, unknown>) => ({
    layout: parseLayoutOverride(search.layout),
  }),
  loader: async ({ params }) => {
    const seo = await fetchSalonSeoMeta(params.id);
    return { seo };
  },
  head: ({ loaderData, params }) => buildSalonHeadMeta(params.id, loaderData?.seo ?? null),
  component: SalonPage,
});

function parseLayoutOverride(value: unknown): SalonDesktopLayoutId | undefined {
  const n = Number(value);
  if (n >= 1 && n <= 5) return n as SalonDesktopLayoutId;
  return undefined;
}

function SalonPage() {
  const { t } = useTranslation();
  const isLgUp = useIsLgUp();
  const { id } = useParams({ from: "/salon/$id" });
  const { layout: layoutOverride } = Route.useSearch();
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
      {isLgUp ? (
        <SalonDesktopPage {...pageProps} layoutOverride={layoutOverride ?? null} />
      ) : (
        <SalonMobilePage {...pageProps} />
      )}
      {shareSalon ? (
        <SalonShareSheet open={shareOpen} onOpenChange={setShareOpen} salon={shareSalon} />
      ) : null}
    </>
  );
}
