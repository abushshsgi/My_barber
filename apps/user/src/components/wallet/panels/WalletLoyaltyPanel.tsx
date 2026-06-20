import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export function WalletLoyaltyPanel() {
  return (
    <EmptyState
      icon={<Sparkles className="h-7 w-7" />}
      title="Bonus dasturi tez orada"
      description="Loyalty API ulanganda ball va imtiyozlar shu yerda ko'rinadi."
    />
  );
}
