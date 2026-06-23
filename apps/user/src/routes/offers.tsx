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
    <div className="min-h-full bg-background pb-[calc(68px+env(safe-area-inset-bottom)+12px)]">
      <PageHeader showBack title={t("nav.offers", { defaultValue: "Aksiyalar" })} />
      <div className="border-t border-border px-5 py-6">
        <OffersPageContent />
      </div>
    </div>
  );
}

function OffersPage() {
  return <DesktopPageSplit mobile={<OffersMobile />} desktop={<OffersDesktopPage />} />;
}
