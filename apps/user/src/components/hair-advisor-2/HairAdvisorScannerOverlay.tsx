import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HA_SCANNER } from "./hair-advisor-scanner-theme";
import type { ScannerUiPhase } from "@/hooks/use-smart-scanner";

type Props = {
  phase: ScannerUiPhase;
  statusText: string;
  mode: "barcode" | "product_image";
  visible: boolean;
};

export function HairAdvisorScannerOverlay({ phase, statusText, mode, visible }: Props) {
  if (!visible) return null;

  const success = phase === "barcode_detected";
  const showLine =
    mode === "barcode" &&
    (phase === "scanning" || phase === "idle") &&
    phase !== "permission_denied" &&
    phase !== "camera_unavailable" &&
    phase !== "requesting_permission";
  const accent = success ? HA_SCANNER.success : HA_SCANNER.frame;

  return (
    <div className="pointer-events-none absolute inset-0 z-[2]">
      {/* Soft dim outside the scan region */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 flex items-center justify-center px-[7.5%] py-24 md:px-[12%]">
        <div
          className={cn(
            "relative w-full max-w-md",
            mode === "barcode" ? "h-[110px] sm:h-[130px]" : "h-[min(52vh,420px)]",
          )}
        >
          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20" />
          <Corner accent={accent} position="tl" />
          <Corner accent={accent} position="tr" />
          <Corner accent={accent} position="bl" />
          <Corner accent={accent} position="br" />
          {success ? <SuccessBadge /> : null}
          {showLine ? <ScanLine color={HA_SCANNER.frame} /> : null}
        </div>
      </div>

      {statusText ? (
        <p
          className="absolute bottom-[28%] left-0 right-0 px-6 text-center text-sm font-medium text-white drop-shadow-lg"
          role="status"
          aria-live="polite"
        >
          {statusText}
        </p>
      ) : null}
    </div>
  );
}

function Corner({ accent, position }: { accent: string; position: "tl" | "tr" | "bl" | "br" }) {
  return (
    <span
      className={cn(
        "absolute h-10 w-10 sm:h-12 sm:w-12",
        position === "tl" && "left-0 top-0 rounded-tl-lg border-l-2 border-t-2",
        position === "tr" && "right-0 top-0 rounded-tr-lg border-r-2 border-t-2",
        position === "bl" && "bottom-0 left-0 rounded-bl-lg border-b-2 border-l-2",
        position === "br" && "bottom-0 right-0 rounded-br-lg border-b-2 border-r-2",
      )}
      style={{ borderColor: accent }}
    />
  );
}

function SuccessBadge() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span
        className="inline-flex size-12 items-center justify-center rounded-full"
        style={{ backgroundColor: HA_SCANNER.success }}
      >
        <Check className="size-6 text-white" strokeWidth={2.5} />
      </span>
    </div>
  );
}

function ScanLine({ color }: { color: string }) {
  return (
    <span
      className="absolute left-[8%] right-[8%] h-px animate-[ha-scan-line_2.1s_ease-in-out_infinite]"
      style={{
        top: "20%",
        backgroundColor: color,
        boxShadow: `0 0 8px ${color}`,
      }}
    />
  );
}
