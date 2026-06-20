import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  FavoriteSalonsPanel,
  FavoriteStylistsPanel,
  FavoritesTabs,
  type FavoritesTab,
} from "@/components/favorites/FavoritesPageContent";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";

const favoritesSearchSchema = z.object({
  tab: z.enum(["salons", "stylists"]).optional().catch("salons"),
});

export const Route = createFileRoute("/favorites")({
  validateSearch: favoritesSearchSchema,
  head: () => ({ meta: [{ title: "Sevimlilar — mysaloon.uz" }] }),
  component: Favorites,
});

function Favorites() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: Route.fullPath });
  const { tab = "salons" } = Route.useSearch();

  const setTab = (next: FavoritesTab) => {
    void navigate({ search: { tab: next }, replace: true });
  };

  return (
    <ProfileSubpageLayout title={t("favorites.hubTitle", { defaultValue: "Sevimlilar" })}>
      <FavoritesTabs tab={tab} onTabChange={setTab} />
      {tab === "salons" ? <FavoriteSalonsPanel /> : <FavoriteStylistsPanel />}
    </ProfileSubpageLayout>
  );
}
