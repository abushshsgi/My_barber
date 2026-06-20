import { DESKTOP_ACCOUNT_BG } from "@/components/desktop/ui/desktop-glass";
import { SettingsTopBar } from "@/components/settings/SettingsTopBar";
import { WalletAirbnbSidebar } from "@/components/wallet/WalletAirbnbSidebar";
import { WalletPanelContent } from "@/components/wallet/WalletPanelContent";
import type { WalletSection } from "@/lib/wallet-nav";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type Props = {
  section: WalletSection;
};

export function WalletDesktopPage({ section }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full", DESKTOP_ACCOUNT_BG)}>
      <div className="lg:pl-8 xl:pl-14">
        <SettingsTopBar
          className="mb-6 border-b border-border/70 pb-4"
          backLabel={t("common.back", { defaultValue: "Orqaga" })}
          doneLabel={t("settings.done", { defaultValue: "Tayyor" })}
        />

        <div className="flex flex-col gap-10 lg:flex-row lg:gap-10 xl:gap-14 lg:pb-12">
          <aside className="lg:w-[380px] xl:w-[420px] lg:shrink-0">
            <h1 className="text-[32px] font-semibold tracking-tight text-foreground xl:text-[36px]">
              {t("walletPage.title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("walletPage.pullHint")}</p>
            <div className="mt-7">
              <WalletAirbnbSidebar active={section} t={t} large />
            </div>
          </aside>

          <main className="min-w-0 flex-1 lg:max-w-[720px] xl:max-w-[780px] lg:pt-1">
            <WalletPanelContent section={section} />
          </main>
        </div>
      </div>
    </div>
  );
}
