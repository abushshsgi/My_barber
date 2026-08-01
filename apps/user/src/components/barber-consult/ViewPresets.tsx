import { useTranslation } from "react-i18next";
import { EXPLORE_VIEW_IDS, type ExploreViewId } from "@/lib/explore-views";
import { cn } from "@/lib/utils";

type Props = {
  activeView: ExploreViewId;
  onViewChange: (view: ExploreViewId) => void;
  /** Agar berilsa, faqat shu burchaklar ko‘rsatiladi. */
  availableViews?: readonly ExploreViewId[];
  className?: string;
};

export function ViewPresets({
  activeView,
  onViewChange,
  availableViews = EXPLORE_VIEW_IDS,
  className,
}: Props) {
  const { t } = useTranslation();
  const views = availableViews.length ? availableViews : EXPLORE_VIEW_IDS;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {views.map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onViewChange(view)}
          className={cn(
            "min-h-9 rounded-xl px-3 text-[12px] font-bold touch-manipulation active:scale-95",
            activeView === view
              ? "bg-foreground text-background"
              : "bg-neutral-100 text-foreground ring-1 ring-border",
          )}
        >
          {t(`barberConsult.views.${view}`, { defaultValue: view })}
        </button>
      ))}
    </div>
  );
}
