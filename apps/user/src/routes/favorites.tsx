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
import { resolveActivityBackTo } from "@/lib/activity-nav";

const favoritesSearchSchema = z.object({
  tab: z.enum(["salons", "stylists"]).optional().catch("salons"),
  backTo: z.string().optional(),
});

export const Route = createFileRoute("/favorites")({
  validateSearch: favoritesSearchSchema,
  head: () => ({ meta: [{ title: "Sevimlilar — mysaloon.uz" }] }),
  component: Favorites,
});

function FavoritesMobile({
  tab,
  setTab,
  backTo,
}: {
  tab: FavoritesTab;
  setTab: (tab: FavoritesTab) => void;
  backTo: string;
}) {
  const { t } = useTranslation();
  const { ids } = useFavorites();

  return (
    <ProfileSubpageLayout
      title={t("favorites.hubTitle", { defaultValue: "Sevimlilar" })}
      subtitle={t("favorites.subtitle", {
        defaultValue: "Saqlangan salonlar va ustalar — tez kirish uchun.",
      })}
      backTo={backTo}
      strictBack
      flush
      headerExtra={
        <div className="mt-3">
          <FavoritesTabs tab={tab} onTabChange={setTab} salonCount={ids.length} />
        </div>
      }
    >
      <div className="px-4 pb-6">
        {tab === "salons" ? <FavoriteSalonsPanel borderless /> : <FavoriteStylistsPanel borderless />}
      </div>
    </ProfileSubpageLayout>
  );
}

function Favorites() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { tab = "salons" } = search;
  const backTo = resolveActivityBackTo(search, "/profile");

  const setTab = (next: FavoritesTab) => {
    void navigate({ search: { tab: next }, replace: true });
  };

  return (
    <DesktopPageSplit
      mobile={<FavoritesMobile tab={tab} setTab={setTab} backTo={backTo} />}
      desktop={<FavoritesDesktopPage tab={tab} onTabChange={setTab} />}
    />
  );
}
