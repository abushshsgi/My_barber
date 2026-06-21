import { WalletDesktopOverviewPanel } from "@/components/desktop/wallet/WalletDesktopOverviewPanel";
import { WalletGiftPanel } from "@/components/wallet/panels/WalletGiftPanel";
import { WalletLoyaltyPanel } from "@/components/wallet/panels/WalletLoyaltyPanel";
import { WalletOffersPanel } from "@/components/wallet/panels/WalletOffersPanel";
import { WalletTransactionsPanel } from "@/components/wallet/WalletTransactionsPanel";
import { SettingsPaymentMethodsPanel } from "@/components/settings/panels/SettingsPaymentMethodsPanel";
import { SettingsSubscriptionsPanel } from "@/components/settings/panels/SettingsSubscriptionsPanel";
import { WALLET_SECTION_TITLE_KEYS, type WalletSection } from "@/lib/wallet-nav";
import { useTranslation } from "react-i18next";

type Props = {
  section: WalletSection;
  hideTitle?: boolean;
};

export function WalletPanelContent({ section, hideTitle }: Props) {
  const { t } = useTranslation();
  const titleMeta = WALLET_SECTION_TITLE_KEYS[section];

  return (
    <div>
      {!hideTitle ? (
        <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
          {t(titleMeta.titleKey, { defaultValue: titleMeta.defaultTitle })}
        </h2>
      ) : null}

      <div className={hideTitle ? undefined : "mt-4"}>
        {section === "overview" && <WalletDesktopOverviewPanel />}

        {section === "transactions" && <WalletTransactionsPanel limit={30} showFullHistoryLink={false} />}

        {section === "payments" && <SettingsPaymentMethodsPanel />}

        {section === "gift" && <WalletGiftPanel />}

        {section === "loyalty" && <WalletLoyaltyPanel />}

        {section === "offers" && <WalletOffersPanel />}

        {section === "subscriptions" && <SettingsSubscriptionsPanel />}
      </div>
    </div>
  );
}
