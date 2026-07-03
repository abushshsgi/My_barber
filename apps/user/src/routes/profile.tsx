import { createFileRoute } from "@tanstack/react-router";
import "@/i18n/config";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ProfileDesktopPage } from "@/components/desktop/pages/ProfileDesktopPage";
import { UserProfile } from "@/components/profile/UserProfile";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { MOBILE_CONTENT_PADDING_CLASS } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

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
        <div className={cn(MOBILE_CONTENT_PADDING_CLASS)}>
          <UserProfile key={lang} />
        </div>
      }
      desktop={<ProfileDesktopPage key={lang} />}
    />
  );
}
