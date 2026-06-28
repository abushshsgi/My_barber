import { useTranslation } from "react-i18next";
import { Check, User, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudience, type AudienceFilter } from "@/hooks/use-audience";

const OPTIONS: { key: AudienceFilter; tKey: string; Icon: typeof Users }[] = [
  { key: "all", tKey: "audience.all", Icon: Users },
  { key: "men", tKey: "audience.men", Icon: User },
  { key: "women", tKey: "audience.women", Icon: UserRound },
];

const ACTIVE_TONE: Record<AudienceFilter, string> = {
  all: "bg-audience-all",
  men: "bg-audience-men",
  women: "bg-audience-women",
};

type Props = {
  showProfileHint?: boolean;
  variant?: "default" | "compact" | "header";
};

export function AudienceSwitch({ showProfileHint = true, variant = "default" }: Props) {
  const { t } = useTranslation();
  const { audience, setAudience, profileDefault } = useAudience();
  const showHint = variant === "default" && showProfileHint && audience === profileDefault && audience !== "all";
  const compact = variant === "compact";
  const header = variant === "header";

  if (header) {
    return (
      <div
        role="radiogroup"
        aria-label={t("settings.preferredAudience")}
        className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-1"
      >
        {OPTIONS.map((opt) => {
          const active = audience === opt.key;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t(opt.tKey)}
              title={t(opt.tKey)}
              onClick={() => setAudience(opt.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-[12px] font-bold transition-colors 2xl:px-3",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
              <span className="hidden 2xl:inline">{t(opt.tKey)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label={t("settings.preferredAudience")}
        className={cn(
          "grid grid-cols-3 gap-1 border border-border bg-surface p-0.5",
          compact ? "rounded-xl" : "gap-1.5 rounded-2xl p-1",
        )}
      >
        {OPTIONS.map((opt) => {
          const active = audience === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setAudience(opt.key)}
              className={cn(
                "relative font-bold tracking-wide transition-all active:scale-[0.98]",
                compact ? "rounded-lg px-2 py-1.5 text-[10px]" : "rounded-xl py-2.5 text-[12px]",
                active
                  ? cn(
                      ACTIVE_TONE[opt.key],
                      compact ? "text-foreground ring-1 ring-foreground" : "pr-5 text-foreground ring-2 ring-foreground",
                    )
                  : "bg-background/80 text-foreground/55 hover:bg-background hover:text-foreground/75",
              )}
            >
              {t(opt.tKey)}
              {active && !compact && (
                <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-foreground text-background">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {showHint && (
        <p className="mt-1.5 text-center text-[10px] font-bold text-muted-foreground">
          {t("audience.profileHint")}
        </p>
      )}
    </div>
  );
}
