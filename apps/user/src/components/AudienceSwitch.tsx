import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudience, type AudienceFilter } from "@/hooks/use-audience";

const OPTIONS: {
  key: AudienceFilter;
  tKey: string;
  tone: "bg-audience-all" | "bg-audience-men" | "bg-audience-women";
}[] = [
  { key: "all", tKey: "audience.all", tone: "bg-audience-all" },
  { key: "men", tKey: "audience.men", tone: "bg-audience-men" },
  { key: "women", tKey: "audience.women", tone: "bg-audience-women" },
];

type Props = {
  showProfileHint?: boolean;
};

export function AudienceSwitch({ showProfileHint = true }: Props) {
  const { t } = useTranslation();
  const { audience, setAudience, profileDefault } = useAudience();
  const showHint = showProfileHint && audience === profileDefault && audience !== "all";

  return (
    <div>
      <div
        role="radiogroup"
        aria-label={t("settings.preferredAudience")}
        className="grid grid-cols-3 gap-1.5 rounded-2xl bg-background p-1"
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
                "relative rounded-xl py-2.5 text-[12px] font-bold tracking-wide transition-all active:scale-[0.98]",
                opt.tone,
                active
                  ? "pr-5 text-foreground ring-2 ring-foreground"
                  : "text-foreground/65 hover:text-foreground/85",
              )}
            >
              {t(opt.tKey)}
              {active && (
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
