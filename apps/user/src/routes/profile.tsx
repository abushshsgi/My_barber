import { createFileRoute } from "@tanstack/react-router";
import { ProfileVariant13 } from "@/components/profile/ProfileVariant13";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profil — mysaloon.uz" }] }),
  component: Profile,
});

function Profile() {
  return (
    <div className="pb-[calc(68px+env(safe-area-inset-bottom)+8px)]">
      <ProfileVariant13 />
    </div>
  );
}
