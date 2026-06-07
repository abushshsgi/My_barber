import { useTranslation } from "react-i18next";
import { AI_STYLE_VARIANTS, type AiStyleVariant } from "@/components/ai-style/ai-style-variants";
import { cn } from "@/lib/utils";

type Props = {
  variant: AiStyleVariant;
  onChange: (variant: AiStyleVariant) => void;
  className?: string;
};

export function AiStyleVariantPicker({ variant, onChange, className }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-foreground/25 bg-background/80 p-3",
        className,
      )}
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {t("aiStylePage.variantPicker")}
      </p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {AI_STYLE_VARIANTS.map((key) => {
          const active = variant === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-[11px] font-bold transition-colors active:scale-95",
                active
                  ? "bg-foreground text-background"
                  : "border border-border bg-surface text-foreground",
              )}
            >
              {t(`aiStylePage.variants.${key}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
