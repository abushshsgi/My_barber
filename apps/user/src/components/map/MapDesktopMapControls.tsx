import type { ReactNode } from "react";
import { Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SalonMapHandle } from "@/components/map/SalonMap";
import { cn } from "@/lib/utils";

type Props = {
  expanded: boolean;
  mapHandle: SalonMapHandle | null;
  mapLoading?: boolean;
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
        "pointer-events-auto flex items-center justify-center bg-foreground text-background shadow-[0_6px_24px_rgba(0,0,0,0.25)] transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Xarita konteyneri ustida — expand va zoom */
export function MapDesktopMapControls({
  expanded,
  mapHandle,
  mapLoading,
  onExpand,
  onCollapse,
}: Props) {
  const { t } = useTranslation();
  const disabled = mapLoading || !mapHandle;

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-[80] flex flex-col items-end gap-2">
      <ControlBtn
        onClick={expanded ? onCollapse : onExpand}
        disabled={mapLoading}
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

      <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl shadow-[0_6px_24px_rgba(0,0,0,0.25)]">
        <ControlBtn
          onClick={() => mapHandle?.zoomIn()}
          disabled={disabled}
          label={t("map.zoomIn")}
          className="h-11 w-11 rounded-none border-b border-background/15"
        >
          <Plus className="h-4 w-4" strokeWidth={2.8} />
        </ControlBtn>
        <ControlBtn
          onClick={() => mapHandle?.zoomOut()}
          disabled={disabled}
          label={t("map.zoomOut")}
          className="h-11 w-11 rounded-none"
        >
          <Minus className="h-4 w-4" strokeWidth={2.8} />
        </ControlBtn>
      </div>
    </div>
  );
}
