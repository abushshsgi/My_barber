import { createPortal } from "react-dom";
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
      className={cn(
        "flex items-center justify-center bg-foreground text-background shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
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

/** Portal — 2GIS canvas ustida, har doim ko'rinadi */
export function MapDesktopMapControls({
  expanded,
  getMapHandle,
  mapReady,
  onExpand,
  onCollapse,
}: Props) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktopMap();

  if (!isDesktop || typeof document === "undefined") return null;

  const ui = (
    <div
      className="fixed right-5 top-[5.25rem] z-[9999] flex flex-col items-end gap-2"
      data-map-controls
    >
      <ControlBtn
        onClick={expanded ? onCollapse : onExpand}
        label={expanded ? t("map.collapseMap") : t("map.expandMap")}
        className="h-11 gap-2 rounded-xl px-3.5"
      >
        {expanded ? (
          <Minimize2 className="h-4 w-4 shrink-0" strokeWidth={2.4} />
        ) : (
          <Maximize2 className="h-4 w-4 shrink-0" strokeWidth={2.4} />
        )}
        <span className="text-[12px] font-bold">
          {expanded ? t("map.collapseMap") : t("map.expandMap")}
        </span>
      </ControlBtn>

      <div className="flex flex-col overflow-hidden rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
        <ControlBtn
          onClick={() => getMapHandle()?.zoomIn()}
          disabled={!mapReady}
          label={t("map.zoomIn")}
          className="h-11 w-11 rounded-none border-b border-background/20"
        >
          <Plus className="h-4 w-4" strokeWidth={2.8} />
        </ControlBtn>
        <ControlBtn
          onClick={() => getMapHandle()?.zoomOut()}
          disabled={!mapReady}
          label={t("map.zoomOut")}
          className="h-11 w-11 rounded-none"
        >
          <Minus className="h-4 w-4" strokeWidth={2.8} />
        </ControlBtn>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
