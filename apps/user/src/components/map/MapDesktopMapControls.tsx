import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SalonMapHandle } from "@/components/map/SalonMap";
import { cn } from "@/lib/utils";

type Props = {
  expanded: boolean;
  getMapHandle: () => SalonMapHandle | null;
  mapReady: boolean;
  onExpand: () => void;
  onCollapse: () => void;
};

function ControlBtn({
  onClick,
  disabled,
  label,
  className,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "pointer-events-auto flex items-center justify-center border border-border/40 bg-background/95 text-foreground shadow-[0_4px_18px_rgba(0,0,0,0.14)] backdrop-blur-sm transition hover:bg-background active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

function useIsDesktopMap() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isDesktop;
}

/** Xarita panelining past-o'ng burchagi — Airbnb/Booking uslubi */
export function MapDesktopMapControls({
  expanded,
  getMapHandle,
  mapReady,
  onExpand,
  onCollapse,
}: Props) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktopMap();

  if (!isDesktop) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-5 right-5 z-20 flex flex-col items-end gap-2"
      data-map-controls
    >
      <ControlBtn
        onClick={expanded ? onCollapse : onExpand}
        label={expanded ? t("map.collapseMap") : t("map.expandMap")}
        className="h-10 w-10 rounded-full"
      >
        {expanded ? (
          <Minimize2 className="h-4 w-4" strokeWidth={2.4} />
        ) : (
          <Maximize2 className="h-4 w-4" strokeWidth={2.4} />
        )}
      </ControlBtn>

      <div className="flex flex-col overflow-hidden rounded-xl border border-border/40 bg-background/95 shadow-[0_4px_18px_rgba(0,0,0,0.14)] backdrop-blur-sm">
        <ControlBtn
          onClick={() => getMapHandle()?.zoomIn()}
          disabled={!mapReady}
          label={t("map.zoomIn")}
          className="h-10 w-10 rounded-none border-0 border-b border-border/30 bg-transparent shadow-none"
        >
          <Plus className="h-4 w-4" strokeWidth={2.8} />
        </ControlBtn>
        <ControlBtn
          onClick={() => getMapHandle()?.zoomOut()}
          disabled={!mapReady}
          label={t("map.zoomOut")}
          className="h-10 w-10 rounded-none border-0 bg-transparent shadow-none"
        >
          <Minus className="h-4 w-4" strokeWidth={2.8} />
        </ControlBtn>
      </div>
    </div>
  );
}
