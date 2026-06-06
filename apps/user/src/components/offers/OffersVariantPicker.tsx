import { useTranslation } from "react-i18next";
import {
  type OffersPageVariant,
  OFFERS_PAGE_VARIANTS,
  offersVariantMeta,
} from "@/components/offers/offers-variants";
import { cn } from "@/lib/utils";

type Props = {
  value: OffersPageVariant;
  onChange: (variant: OffersPageVariant) => void;
};

export function OffersVariantPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const activeIndex = OFFERS_PAGE_VARIANTS.indexOf(value) + 1;

  return (
    <section className="mb-4 rounded-[24px] border border-dashed border-border bg-surface/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("offersPage.variantPicker.title")}
        </p>
        <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
          {activeIndex}/3
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{t("offersPage.variantPicker.subtitle")}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {OFFERS_PAGE_VARIANTS.map((id, index) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 transition-colors",
                active ? "border-foreground bg-background" : "border-transparent bg-background/70",
              )}
            >
              <span className="text-[9px] font-bold text-muted-foreground">{index + 1}</span>
              <span className="line-clamp-2 min-h-[28px] text-center text-[9px] font-bold leading-tight">
                {t(offersVariantMeta[id].labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
