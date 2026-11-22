import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HA_SCANNER } from "./hair-advisor-scanner-theme";
import type { ScannerUiPhase } from "@/hooks/use-hair-advisor-scanner";

type Props = {
  phase: ScannerUiPhase;
  statusText: string;
  mode: "barcode" | "product_image";
  visible: boolean;
};

export function HairAdvisorScannerOverlay({ phase, statusText, mode, visible }: Props) {
  if (!visible) return null;

  const success = phase === "barcode_detected";
  const showLine = mode === "barcode" && (phase === "scanning" || phase === "idle");
  const accent = success ? HA_SCANNER.success : HA_SCANNER.purple;

  return (
    <div className="pointer-events-none absolute inset-0 z-[2]">
      <div className="absolute inset-0 flex items-center justify-center px-10 py-24">
        <div className="relative h-[min(52vh,420px)] w-full max-w-md">
          <Corner accent={accent} position="tl" />
          <Corner accent={accent} position="tr" />
          <Corner accent={accent} position="bl" />
          <Corner accent={accent} position="br" />
          {success ? <SuccessBadge /> : null}
          {showLine ? <ScanLine color={accent} /> : null}
        </div>
      </div>

      {statusText ? (
        <p
          className="absolute bottom-[30%] left-0 right-0 px-6 text-center text-sm font-medium text-white drop-shadow-lg"
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
        "absolute h-12 w-12",
        position === "tl" && "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-lg",
        position === "tr" && "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-lg",
        position === "bl" && "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
        position === "br" && "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
      )}
      style={{ borderColor: accent, boxShadow: `0 0 14px ${accent}66` }}
    />
  );
}

function ScanLine({ color }: { color: string }) {
  return (
    <>
      <style>{`@keyframes ha-v2-line{0%,100%{top:15%}50%{top:78%}}`}</style>
      <span
        className="pointer-events-none absolute left-2 right-2 h-[2px] rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          animation: "ha-v2-line 2.4s ease-in-out infinite",
          boxShadow: `0 0 12px ${HA_SCANNER.purpleGlow}`,
        }}
      />
    </>
  );
}

function SuccessBadge() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <span
        className="flex size-16 items-center justify-center rounded-full"
        style={{ background: HA_SCANNER.successGlow, boxShadow: `0 0 28px ${HA_SCANNER.successGlow}` }}
      >
        <Check className="size-9 text-white" strokeWidth={2.5} />
      </span>
      <span className="text-base font-bold text-white drop-shadow-md">Shtrix-kod aniqlandi!</span>
    </div>
  );
}