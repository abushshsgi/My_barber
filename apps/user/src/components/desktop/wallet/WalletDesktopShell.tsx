import { DESKTOP_ACCOUNT_BG } from "@/components/desktop/ui/desktop-glass";
import { WalletPanelContent } from "@/components/wallet/WalletPanelContent";
import { WalletSectionNav } from "@/components/wallet/WalletSectionNav";
import type { WalletSection } from "@/lib/wallet-nav";
import { cn } from "@/lib/utils";

type Props = {
  section: WalletSection;
  t: (key: string, opts?: { defaultValue?: string }) => string;
};

/** Desktop hamyon ichki bo'limlari — sidebar nav + panel (settings uslubi). */
export function WalletDesktopShell({ section, t }: Props) {
  return (
    <div className={cn("w-full", DESKTOP_ACCOUNT_BG)}>
      <div className="lg:pl-8 xl:pl-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-10 xl:gap-14 lg:pb-12">
          <aside className="lg:w-[380px] xl:w-[420px] lg:shrink-0">
            <h1 className="text-[32px] font-semibold tracking-tight text-foreground xl:text-[36px]">
              {t("walletPage.title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("walletPage.subtitle", { defaultValue: "Cashback, sovg'a karta va tarix" })}
            </p>
            <div className="mt-7">
              <WalletSectionNav active={section} t={t} large />
            </div>
          </aside>

          <main className="min-w-0 flex-1 lg:max-w-[760px] xl:max-w-[820px] lg:pt-1">
            <WalletPanelContent section={section} />
          </main>
        </div>
      </div>
    </div>
  );
}
