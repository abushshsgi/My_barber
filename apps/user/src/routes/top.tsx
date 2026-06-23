import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { TopSalonsDesktopPage } from "@/components/desktop/pages/TopSalonsDesktopPage";
import { PageHeader } from "@/components/PageHeader";
import { SalonCard } from "@/components/SalonCard";
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
    <div className="pb-8">
      <PageHeader showBack title={t("topSalonsPage.title")} subtitle={t("topSalonsPage.subtitle")} />
      {loading ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : salons.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("topSalonsPage.empty")}</p>
      ) : (
        <div className="mt-2 space-y-3 px-5">
          {salons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </div>
      )}
    </div>
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
