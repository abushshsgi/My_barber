import { Instagram, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MORF_AI_INSTAGRAM } from "@/lib/morph-share-copy";
import { cn } from "@/lib/utils";

type Props = {
  onShare: () => void;
  sharing?: boolean;
  disabled?: boolean;
  className?: string;
};

/** «Rasmingizni ulashing» bloki — Instagram Story ulashishni asosiy harakatga aylantiradi. */
export function MorfAiShareNudge({ onShare, sharing, disabled, className }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-transparent p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 text-white shadow-sm">
          <Instagram className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-tight text-foreground">
            {t("aiStylePage.instagramStory.nudgeTitle", {
              defaultValue: "Rasmingizni ulashing",
            })}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
            {t("aiStylePage.instagramStory.nudgeText", {
              handle: MORF_AI_INSTAGRAM,
              defaultValue:
                "Story’ga qo‘ying va {{handle}} ni belgilang — do‘stlaringiz yangi obrazingizni ko‘radi va o‘zida sinab ko‘radi.",
            })}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled || sharing}
        onClick={onShare}
        className={cn(
          "mt-3 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl",
          "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 px-4",
          "text-[13px] font-bold text-white shadow-lg shadow-fuchsia-500/20 touch-manipulation",
          "transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {sharing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Instagram className="h-4 w-4" strokeWidth={2.25} />
        )}
        {t("aiStylePage.instagramStory.cta", {
          defaultValue: "Instagram Story’ga ulashish",
        })}
      </button>

      <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground">
        {t("aiStylePage.instagramStory.nudgeFootnote", {
          defaultValue: "Mysaloon shabloni tayyorlanadi, havola avtomatik nusxalanadi.",
        })}
      </p>
    </div>
  );
}
