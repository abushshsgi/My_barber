import type { Salon } from "@/lib/mock-data";
import {
  resolveSalonDesktopLayout,
  type SalonDesktopLayoutId,
} from "@/components/desktop/pages/salon-layouts/types";
import { SalonDesktopLayoutView } from "@/components/desktop/pages/salon-layouts";

export function SalonDesktopPage({
  salon,
  fav,
  onToggleFav,
  onShare,
  favPending = false,
  reviewsAreMock = false,
  layoutOverride,
}: {
  salon: Salon;
  fav: boolean;
  onToggleFav: () => void;
  onShare?: () => void;
  favPending?: boolean;
  reviewsAreMock?: boolean;
  layoutOverride?: SalonDesktopLayoutId | null;
}) {
  const layout = resolveSalonDesktopLayout(salon.id, layoutOverride);

  return (
    <SalonDesktopLayoutView
      layout={layout}
      salon={salon}
      fav={fav}
      onToggleFav={onToggleFav}
      onShare={onShare}
      favPending={favPending}
      reviewsAreMock={reviewsAreMock}
    />
  );
}
