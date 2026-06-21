import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WalletPanelContent } from "@/components/wallet/WalletPanelContent";
import { WALLET_SECTION_TITLE_KEYS, type WalletSection } from "@/lib/wallet-nav";

type Props = {
  section: WalletSection;
};

/** Mobil hamyon ichki bo'limi — orqaga tugmasi bilan bitta layout ichida. */
export function WalletMobileSubpage({ section }: Props) {
  const { t } = useTranslation();
  const meta = WALLET_SECTION_TITLE_KEYS[section];

  return (
    <div className="min-h-full bg-background pb-[calc(68px+env(safe-area-inset-bottom)+12px)]">
      <div className="border-b border-border px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link
          to="/wallet"
          className="inline-flex items-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold text-foreground transition-colors hover:opacity-80"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          {t("common.back", { defaultValue: "Orqaga" })}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("walletPage.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(meta.titleKey, { defaultValue: meta.defaultTitle })}
        </p>
      </div>

      <div className="border-t border-border px-5 py-6">
        <WalletPanelContent section={section} hideTitle />
      </div>
    </div>
  );
}
