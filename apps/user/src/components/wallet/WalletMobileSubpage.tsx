import { useTranslation } from "react-i18next";
import { MobilePageShell } from "@/components/mobile/MobilePageShell";
import { WalletPanelContent } from "@/components/wallet/WalletPanelContent";
import { WALLET_SECTION_TITLE_KEYS, type WalletSection } from "@/lib/wallet-nav";

type Props = {
  section: WalletSection;
};

/** Mobil hamyon ichki bo'limi — neo shell. */
export function WalletMobileSubpage({ section }: Props) {
  const { t } = useTranslation();
  const meta = WALLET_SECTION_TITLE_KEYS[section];

  return (
    <MobilePageShell
      title={t("walletPage.title")}
      subtitle={t(meta.titleKey, { defaultValue: meta.defaultTitle })}
      backTo="/wallet"
    >
      <WalletPanelContent section={section} hideTitle />
    </MobilePageShell>
  );
}
