import { WalletDesktopHero } from "@/components/wallet/WalletDesktopHero";
import { WalletPanelContent } from "@/components/wallet/WalletPanelContent";
import type { WalletSection } from "@/lib/wallet-nav";

type Props = {
  section: WalletSection;
};

export function WalletDesktopPage({ section }: Props) {
  return (
    <div className="min-h-full bg-background pb-16">
      <WalletDesktopHero section={section} />

      <div className="mx-auto max-w-6xl px-6 py-8 xl:px-10">
        <WalletPanelContent section={section} desktopShell />
      </div>
    </div>
  );
}
