import { createFileRoute } from "@tanstack/react-router";
import "@/i18n/config";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ProfileDesktopPage } from "@/components/desktop/pages/ProfileDesktopPage";
import { MorphMobileProfile } from "@/components/profile/MorphMobileProfile";
import { UserProfile } from "@/components/profile/UserProfile";
import { useAppShell } from "@/hooks/use-app-shell";
import { useAppTranslation } from "@/hooks/use-app-translation";
export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profil — mysaloon.uz" }] }),
  component: Profile,
});

function ProfileMobile() {
  const { shell } = useAppShell();
  const { i18n } = useAppTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "uz";
  if (shell === "morph") return <MorphMobileProfile key={lang} />;
  return <UserProfile key={lang} />;
}

function Profile() {
  const { i18n } = useAppTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "uz";

  return (
    <DesktopPageSplit
      mobile={<ProfileMobile />}
      desktop={<ProfileDesktopPage key={lang} />}
    />
  );
}
