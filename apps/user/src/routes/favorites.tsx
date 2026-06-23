import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { FavoritesDesktopPage } from "@/components/desktop/pages/FavoritesDesktopPage";
import {
  FavoriteSalonsPanel,
  FavoriteStylistsPanel,
  FavoritesTabs,
  type FavoritesTab,
} from "@/components/favorites/FavoritesPageContent";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { useFavorites } from "@/hooks/use-favorites";

const favoritesSearchSchema = z.object({
  tab: z.enum(["salons", "stylists"]).optional().catch("salons"),
});

export const Route = createFileRoute("/favorites")({
  validateSearch: favoritesSearchSchema,
  head: () => ({ meta: [{ title: "Sevimlilar — mysaloon.uz" }] }),
  component: Favorites,
});

function FavoritesMobile({ tab, setTab }: { tab: FavoritesTab; setTab: (tab: FavoritesTab) => void }) {
  const { t } = useTranslation();
  const { ids } = useFavorites();

  return (
    <ProfileSubpageLayout
      title={t("favorites.hubTitle", { defaultValue: "Sevimlilar" })}
      subtitle={t("favorites.subtitle", {
        defaultValue: "Saqlangan salonlar va ustalar — tez kirish uchun.",
      })}
    >
      <FavoritesTabs tab={tab} onTabChange={setTab} salonCount={ids.length} />
      <div className="mt-5">
        {tab === "salons" ? <FavoriteSalonsPanel /> : <FavoriteStylistsPanel />}
      </div>
    </ProfileSubpageLayout>
  );
}

function Favorites() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { tab = "salons" } = Route.useSearch();

  const setTab = (next: FavoritesTab) => {
    void navigate({ search: { tab: next }, replace: true });
  };

  return (
    <DesktopPageSplit
      mobile={<FavoritesMobile tab={tab} setTab={setTab} />}
      desktop={<FavoritesDesktopPage tab={tab} onTabChange={setTab} />}
    />
  );
}
