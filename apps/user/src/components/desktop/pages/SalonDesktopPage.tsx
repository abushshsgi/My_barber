import type { Salon } from "@/lib/mock-data";
import {
  LAYOUT_LABELS,
  resolveSalonDesktopLayout,
  type SalonDesktopLayoutId,
} from "@/components/desktop/pages/salon-layouts/types";
import { SalonDesktopLayoutView } from "@/components/desktop/pages/salon-layouts";
import { SalonLayoutSwitcher } from "@/components/salon/SalonLayoutSwitcher";

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
    <div className="space-y-4" data-salon-layout={layout}>
      <SalonLayoutSwitcher salonId={salon.id} activeLayout={layout} />
      <p className="text-xs text-muted-foreground">
        Joriy layout: <span className="font-semibold text-foreground">{LAYOUT_LABELS[layout]}</span>
        {layoutOverride ? null : (
          <span> — salon ID bo&apos;yicha avtomatik tanlandi</span>
        )}
      </p>
      <SalonDesktopLayoutView
        layout={layout}
        salon={salon}
        fav={fav}
        onToggleFav={onToggleFav}
        onShare={onShare}
        favPending={favPending}
        reviewsAreMock={reviewsAreMock}
      />
    </div>
  );
}
