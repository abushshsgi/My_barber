import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAudience, type AudienceFilter } from "@/hooks/use-audience";

const OPTIONS: { key: AudienceFilter; tKey: string }[] = [
  { key: "all", tKey: "audience.all" },
  { key: "men", tKey: "audience.men" },
  { key: "women", tKey: "audience.women" },
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
        className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1"
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
                "rounded-xl py-2.5 text-[12px] font-bold tracking-wide transition-colors active:scale-[0.98]",
                active ? "bg-foreground text-background" : "text-foreground/70",
              )}
            >
              {t(opt.tKey)}
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
