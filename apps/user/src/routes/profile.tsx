import { createFileRoute } from "@tanstack/react-router";
import "@/i18n/config";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ProfileDesktopPage } from "@/components/desktop/pages/ProfileDesktopPage";
import { UserProfile } from "@/components/profile/UserProfile";
import { useAppTranslation } from "@/hooks/use-app-translation";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profil — mysaloon.uz" }] }),
  component: Profile,
});

function Profile() {
  const { i18n } = useAppTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "uz";

  return (
    <DesktopPageSplit
      mobile={
        <div className="pb-[calc(68px+env(safe-area-inset-bottom)+8px)]">
          <UserProfile key={lang} />
        </div>
      }
      desktop={<ProfileDesktopPage key={lang} />}
    />
  );
}
