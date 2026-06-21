import { createFileRoute, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { SalonDesktopPage } from "@/components/desktop/pages/SalonDesktopPage";
import { SalonMobilePage } from "@/components/salon/SalonMobilePage";
import { useFavorites } from "@/hooks/use-favorites";
import { useSalonPage } from "@/hooks/use-salon-page";

export const Route = createFileRoute("/salon/$id")({
  head: () => ({ meta: [{ title: "Salon — mysaloon.uz" }] }),
  component: SalonPage,
});

function SalonPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/salon/$id" });
  const { salon, isLoading } = useSalonPage(id);
  const { isFav, toggle } = useFavorites();

  if (isLoading || !salon) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const fav = isFav(salon.id);
  const toggleFav = () => toggle(salon.id);

  return (
    <DesktopPageSplit
      mobile={<SalonMobilePage salon={salon} fav={fav} onToggleFav={toggleFav} />}
      desktop={<SalonDesktopPage salon={salon} fav={fav} onToggleFav={toggleFav} />}
    />
  );
}
