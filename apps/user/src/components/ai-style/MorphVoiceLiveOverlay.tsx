import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MorphVoicePhase } from "@/lib/morph-voice";

type Props = {
  phase: MorphVoicePhase;
  metering: number;
  transcript?: string;
  reply?: string;
  error?: string | null;
  title: string;
  listeningLabel: string;
  listeningHint: string;
  transcribingLabel: string;
  thinkingLabel: string;
  speakingLabel: string;
  yourTurnLabel: string;
  tapToSend: string;
  interruptLabel: string;
  closeA11y: string;
  onClose: () => void;
  onPrimary: () => void;
};

function statusFor(
  phase: MorphVoicePhase,
  labels: Pick<
    Props,
    "listeningLabel" | "transcribingLabel" | "thinkingLabel" | "speakingLabel" | "yourTurnLabel"
  >,
) {
  if (phase === "recording") return labels.listeningLabel;
  if (phase === "transcribing") return labels.transcribingLabel;
  if (phase === "thinking") return labels.thinkingLabel;
  if (phase === "speaking") return labels.speakingLabel;
  if (phase === "waiting") return labels.yourTurnLabel;
  return labels.listeningLabel;
}

export function MorphVoiceLiveOverlay({
  phase,
  metering,
  transcript,
  reply,
  error,
  title,
  listeningLabel,
  listeningHint,
  transcribingLabel,
  thinkingLabel,
  speakingLabel,
  yourTurnLabel,
  tapToSend,
  interruptLabel,
  closeA11y,
  onClose,
  onPrimary,
}: Props) {
  const listening = phase === "recording";
  const speaking = phase === "speaking";
  const level = Math.max(0, Math.min(1, (metering + 55) / 42));
  const status = statusFor(phase, {
    listeningLabel,
    transcribingLabel,
    thinkingLabel,
    speakingLabel,
    yourTurnLabel,
  });
  const caption = listening
    ? null
    : speaking || phase === "thinking"
      ? reply || transcript
      : transcript;
  const hint = listening ? tapToSend : speaking ? interruptLabel : tapToSend;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0B0D] text-white">
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
          <span
            className={cn(
              "size-2 rounded-full bg-white/35",
              listening && "bg-emerald-400 morph-voice-dot",
            )}
          />
          <span className="text-sm font-semibold tracking-tight">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/10"
          aria-label={closeA11y}
        >
          <X className="size-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onPrimary}
        className="flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center px-7 pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        <div className="relative grid size-[15.5rem] place-items-center">
          <span
            className={cn("morph-voice-ring absolute size-52 rounded-full", listening && "is-live")}
            style={{ opacity: listening ? 0.22 + level * 0.2 : 0.12 }}
          />
          <span
            className={cn(
              "morph-voice-ring-slow absolute size-64 rounded-full",
              listening && "is-live",
            )}
          />
          <span
            className={cn(
              "relative grid size-36 place-items-center rounded-full border",
              listening ? "border-emerald-400 bg-emerald-950" : "border-white/15 bg-white/[0.06]",
            )}
            style={{ transform: `scale(${1 + (listening ? level * 0.08 : 0)})` }}
          >
            <span className="morph-voice-wave" data-live={listening || speaking ? "1" : "0"}>
              {Array.from({ length: 9 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    animationDelay: `${i * 70}ms`,
                    height: `${10 + (listening ? 18 + level * 28 : speaking ? 22 : 12) * (1 - Math.abs(i - 4) * 0.08)}px`,
                  }}
                />
              ))}
            </span>
          </span>
        </div>
        <p className="mt-9 text-center text-[1.375rem] font-bold tracking-tight">{status}</p>
        {listening ? (
          <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-white/55">
            {listeningHint}
          </p>
        ) : caption ? (
          <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-white/50">
            {caption}
          </p>
        ) : null}
        {error ? <p className="mt-3 max-w-sm text-center text-sm text-red-400">{error}</p> : null}
        <p className="mt-8 text-xs text-white/35">{hint}</p>
      </button>
    </div>
  );
}
