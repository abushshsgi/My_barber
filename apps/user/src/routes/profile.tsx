import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { UserProfile } from "@/components/profile/UserProfile";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profil — mysaloon.uz" }] }),
  component: Profile,
});

function Profile() {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "uz";

  return (
    <div className="pb-[calc(68px+env(safe-area-inset-bottom)+8px)]">
      <UserProfile key={lang} />
    </div>
  );
}
