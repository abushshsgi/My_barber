import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { OffersDesktopPage } from "@/components/desktop/pages/OffersDesktopPage";
import { OffersPageContent } from "@/components/offers/OffersPageContent";
import { PageHeader } from "@/components/PageHeader";

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
    <div className="min-h-full bg-surface pb-[calc(68px+env(safe-area-inset-bottom)+12px)]">
      <PageHeader
        showBack
        title={t("nav.offers", { defaultValue: "Aksiyalar" })}
        subtitle={t("offersPage.mobileSubtitle", {
          defaultValue: "Kuponlar va maxsus takliflar bir joyda.",
        })}
      />
      <div className="page-stagger rounded-t-[28px] bg-background px-5 py-6 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.08)]">
        <OffersPageContent />
      </div>
    </div>
  );
}

function OffersPage() {
  return <DesktopPageSplit mobile={<OffersMobile />} desktop={<OffersDesktopPage />} />;
}
