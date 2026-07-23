import { useTranslation } from "react-i18next";
import { MobilePageShell } from "@/components/mobile/MobilePageShell";
import { WalletPanelContent } from "@/components/wallet/WalletPanelContent";
import { WALLET_SECTION_TITLE_KEYS, type WalletSection } from "@/lib/wallet-nav";

type Props = {
  section: WalletSection;
  backTo?: string;
};

/** Mobil hamyon ichki bo'limi — to'liq ekran shell. */
export function WalletMobileSubpage({ section, backTo = "/wallet" }: Props) {
  const { t } = useTranslation();
  const meta = WALLET_SECTION_TITLE_KEYS[section];

  return (
    <MobilePageShell
      title={t("walletPage.title")}
      subtitle={t(meta.titleKey, { defaultValue: meta.defaultTitle })}
      backTo={backTo}
      strictBack
      flush
    >
      <div className={section === "gift" ? "px-4 pb-4" : "px-4 pb-8"}>
        <WalletPanelContent section={section} hideTitle />
      </div>
    </MobilePageShell>
  );
}
