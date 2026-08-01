import { Instagram, Loader2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MORF_AI_INSTAGRAM } from "@/lib/morph-share-copy";
import { cn } from "@/lib/utils";

type Props = {
  onShare: () => void;
  onTelegramShare?: () => void;
  sharing?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Share nudge — Instagram Story + Telegram (UZ-first). */
export function MorfAiShareNudge({
  onShare,
  onTelegramShare,
  sharing,
  disabled,
  className,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-neutral-50 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-black text-white">
          <Send className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-tight text-foreground">
            {t("aiStylePage.shareNudge.title", {
              defaultValue: "Do‘stlarga ulashing",
            })}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
            {t("aiStylePage.shareNudge.text", {
              handle: MORF_AI_INSTAGRAM,
              defaultValue:
                "Telegram yoki Instagram Story orqali yuboring — do‘stlaringiz ham o‘zida sinab ko‘radi.",
            })}
          </p>
        </div>
      </div>

      <div className={cn("mt-3 grid gap-2", onTelegramShare ? "grid-cols-2" : "grid-cols-1")}>
        {onTelegramShare ? (
          <button
            type="button"
            disabled={disabled || sharing}
            onClick={onTelegramShare}
            className={cn(
              "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl",
              "bg-[#2AABEE] px-3 text-[12px] font-bold text-white touch-manipulation",
              "transition-opacity duration-200 active:opacity-90",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2.25} />}
            {t("aiStylePage.shareNudge.telegram", { defaultValue: "Telegram" })}
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled || sharing}
          onClick={onShare}
          className={cn(
            "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl",
            "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 px-3",
            "text-[12px] font-bold text-white touch-manipulation",
            "transition-opacity duration-200 active:opacity-90",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {sharing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Instagram className="h-4 w-4" strokeWidth={2.25} />
          )}
          {t("aiStylePage.instagramStory.ctaShort", {
            defaultValue: "Instagram",
          })}
        </button>
      </div>
    </div>
  );
}
