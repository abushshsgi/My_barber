import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Clock3, Compass, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

type Tone = "light" | "dark";

type Props = {
  tone?: Tone;
  className?: string;
  title?: string;
  /** Capture flow ichida Morf hub ga qaytish */
  onBack?: () => void;
};

export function AiStyleChrome({ tone = "light", className, title, onBack }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = tone === "dark";

  const iconBtn = cn(
    "grid size-10 place-items-center rounded-full transition-opacity active:opacity-70",
    isDark
      ? "bg-white/12 text-white backdrop-blur-md"
      : "border border-foreground/10 bg-background/80 text-foreground backdrop-blur-md",
  );

  return (
    <header
      className={cn(
        "relative z-30 flex items-center gap-1.5 px-4",
        "pt-[max(0.75rem,env(safe-area-inset-top))] pb-2",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => (onBack ? onBack() : navigateBack(router, "/"))}
        className={iconBtn}
        aria-label={t("nav.home")}
        title={t("nav.home")}
      >
        <ChevronLeft className="size-5" strokeWidth={2.25} />
      </button>

      <div className="min-w-0 flex-1 px-1 text-center">
        <p
          className={cn(
            "truncate text-[11px] font-semibold tracking-[0.2em]",
            isDark ? "text-white" : "text-foreground",
          )}
        >
          {title ?? t("aiStylePage.title")}
        </p>
      </div>

      <Link
        to="/explore"
        className={iconBtn}
        aria-label={t("nav.explore")}
      >
        <Compass className="size-[18px]" strokeWidth={2} />
      </Link>
      <Link
        to="/ai-style/history"
        className={iconBtn}
        aria-label={t("aiStylePage.historyButton")}
      >
        <Clock3 className="size-[18px]" strokeWidth={2} />
      </Link>
      <Link
        to="/profile"
        className={iconBtn}
        aria-label={t("nav.profile")}
      >
        <UserRound className="size-[18px]" strokeWidth={2} />
      </Link>
    </header>
  );
}
