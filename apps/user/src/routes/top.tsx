import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { TopSalonsDesktopPage } from "@/components/desktop/pages/TopSalonsDesktopPage";
import { MobileListPage } from "@/components/mobile/MobileListPage";
import { MobileSalonCard } from "@/components/mobile/MobileSalonCard";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";
import { useTopSalons } from "@/hooks/use-top-salons";

export const Route = createFileRoute("/top")({
  head: () => ({
    meta: [
      { title: "Top salonlar — mysaloon.uz" },
      { name: "description", content: "Reytingi 4.8 va undan yuqori bo'lgan eng yaxshi salonlar." },
    ],
  }),
  component: TopSalonsRoute,
});

function TopSalonsMobile() {
  const { t } = useTranslation();
  const { salons, loading } = useTopSalons();

  return (
    <MobileListPage title={t("topSalonsPage.title")} subtitle={t("topSalonsPage.subtitle")}>
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : salons.length === 0 ? (
        <NoSalonsEmpty compact />
      ) : (
        <div className="space-y-3">
          {salons.map((salon) => (
            <MobileSalonCard key={salon.id} salon={salon} />
          ))}
        </div>
      )}
    </MobileListPage>
  );
}

function TopSalonsRoute() {
  const { salons, loading } = useTopSalons();

  return (
    <DesktopPageSplit
      mobile={<TopSalonsMobile />}
      desktop={<TopSalonsDesktopPage salons={salons} loading={loading} />}
    />
  );
}
