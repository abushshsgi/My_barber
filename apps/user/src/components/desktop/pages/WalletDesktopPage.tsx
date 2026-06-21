import { useTranslation } from "react-i18next";
import { WalletDesktopShell } from "@/components/desktop/wallet/WalletDesktopShell";
import type { WalletSection } from "@/lib/wallet-nav";

type Props = {
  section: WalletSection;
};

export function WalletDesktopPage({ section }: Props) {
  const { t } = useTranslation();
  return <WalletDesktopShell section={section} t={t} />;
}
