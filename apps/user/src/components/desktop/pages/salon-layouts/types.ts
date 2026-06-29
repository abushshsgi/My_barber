export type SalonDesktopLayoutId = 1 | 2 | 3 | 4 | 5;

export const LAYOUT_LABELS: Record<SalonDesktopLayoutId, string> = {
  1: "Classic",
  2: "Hero Split",
  3: "Sidebar",
  4: "Editorial",
  5: "Compact",
};

export type SalonDesktopPageProps = {
  salon: import("@/lib/mock-data").Salon;
  fav: boolean;
  onToggleFav: () => void;
  onShare?: () => void;
  favPending?: boolean;
  reviewsAreMock?: boolean;
};

export function resolveSalonDesktopLayout(
  salonId: string,
  override?: SalonDesktopLayoutId | null,
): SalonDesktopLayoutId {
  if (override && override >= 1 && override <= 5) return override;
  const n = Number.parseInt(salonId, 10);
  const hash = Number.isFinite(n) ? n : salonId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((hash % 5) + 1) as SalonDesktopLayoutId;
}
