import { useTranslation } from "react-i18next";
import {
  type WalletCardVariant,
  WALLET_CARD_VARIANTS,
  walletCardThemes,
} from "@/components/wallet/wallet-variants";
import { cn } from "@/lib/utils";

type Props = {
  value: WalletCardVariant;
  onChange: (variant: WalletCardVariant) => void;
};

export function WalletVariantPicker({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <section className="mx-5 mt-4 rounded-[24px] border border-dashed border-border bg-surface/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {t("walletPage.variantPicker.title")}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{t("walletPage.variantPicker.subtitle")}</p>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {WALLET_CARD_VARIANTS.map((id) => {
          const theme = walletCardThemes[id];
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                "flex min-w-[88px] shrink-0 flex-col items-center gap-2 rounded-2xl border px-2 py-2.5 transition-colors",
                active ? "border-foreground bg-background" : "border-transparent bg-background/70",
              )}
            >
              <div
                className={cn("h-10 w-[68px] shadow-sm", theme.rounded)}
                style={{ background: theme.background, boxShadow: theme.boxShadow }}
              />
              <span className="text-[10px] font-bold">{t(theme.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
