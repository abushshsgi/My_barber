import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/loyalty")({
  head: () => ({ meta: [{ title: "Bonus dasturi — mysaloon.uz" }] }),
  component: LoyaltyPage,
});

function LoyaltyPage() {
  return (
    <ProfileSubpageLayout title="Bonus dasturi">
      <EmptyState
        icon={<Sparkles className="h-7 w-7" />}
        title="Bonus dasturi tez orada"
        description="Loyalty API ulanganda ball va imtiyozlar shu yerda ko'rinadi."
      />
    </ProfileSubpageLayout>
  );
}
