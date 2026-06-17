import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAudience, type AudienceFilter } from "@/hooks/use-audience";

const OPTIONS: { key: AudienceFilter; tKey: string }[] = [
  { key: "all", tKey: "audience.all" },
  { key: "men", tKey: "audience.men" },
  { key: "women", tKey: "audience.women" },
];

export function MapAudienceChips() {
  const { t } = useTranslation();
  const { audience, setAudience } = useAudience();

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 pb-1">
      {OPTIONS.map((opt) => {
        const active = audience === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => setAudience(opt.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-colors active:scale-95",
              active ? "bg-foreground text-background" : "bg-surface text-foreground",
            )}
          >
            {t(opt.tKey)}
          </button>
        );
      })}
    </div>
  );
}
