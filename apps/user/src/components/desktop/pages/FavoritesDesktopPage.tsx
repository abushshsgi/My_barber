import { useTranslation } from "react-i18next";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import {
  FavoriteSalonsPanel,
  FavoriteStylistsPanel,
  FavoritesTabs,
  type FavoritesTab,
} from "@/components/favorites/FavoritesPageContent";
import { useFavorites } from "@/hooks/use-favorites";

type Props = {
  tab: FavoritesTab;
  onTabChange: (tab: FavoritesTab) => void;
};

export function FavoritesDesktopPage({ tab, onTabChange }: Props) {
  const { t } = useTranslation();
  const { ids } = useFavorites();

  return (
    <AccountDesktopShell
      wide
      bare
      backTo="/profile"
      title={t("favorites.hubTitle", { defaultValue: "Sevimlilar" })}
      subtitle={t("favorites.subtitle", {
        defaultValue: "Saqlangan salonlar va ustalar — tez kirish uchun.",
      })}
    >
      <FavoritesTabs tab={tab} onTabChange={onTabChange} salonCount={ids.length} />
      <div className="mt-6">
        {tab === "salons" ? (
          <FavoriteSalonsPanel variant="desktop" />
        ) : (
          <FavoriteStylistsPanel />
        )}
      </div>
    </AccountDesktopShell>
  );
}
