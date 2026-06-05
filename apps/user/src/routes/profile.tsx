import { createFileRoute } from "@tanstack/react-router";
import { UserProfile } from "@/components/profile/UserProfile";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profil — mysaloon.uz" }] }),
  component: Profile,
});

function Profile() {
  return (
    <div className="pb-[calc(68px+env(safe-area-inset-bottom)+8px)]">
      <UserProfile />
    </div>
  );
}
