import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { OffersDesktopPage } from "@/components/desktop/pages/OffersDesktopPage";
import { OffersPageContent } from "@/components/offers/OffersPageContent";
import { MobileListPage } from "@/components/mobile/MobileListPage";

export const Route = createFileRoute("/offers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aksiyalar — mysaloon.uz" },
      { name: "description", content: "Salonlar va xizmatlar bo'yicha maxsus takliflar va promokodlar." },
    ],
  }),
  component: OffersPage,
});

function OffersMobile() {
  const { t } = useTranslation();

  return (
    <MobileListPage
      title={t("nav.offers", { defaultValue: "Aksiyalar" })}
      subtitle={t("offersPage.mobileSubtitle", {
        defaultValue: "Kuponlar va maxsus takliflar bir joyda.",
      })}
    >
      <OffersPageContent />
    </MobileListPage>
  );
}

function OffersPage() {
  return <DesktopPageSplit mobile={<OffersMobile />} desktop={<OffersDesktopPage />} />;
}
