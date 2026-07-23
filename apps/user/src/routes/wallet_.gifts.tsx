import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MobilePageShell } from "@/components/mobile/MobilePageShell";
import { WalletReceivedGiftsPage } from "@/components/wallet/WalletReceivedGiftsPage";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";

export const Route = createFileRoute("/wallet_/gifts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mening sovg'alarim — mysaloon.uz" },
      {
        name: "description",
        content: "Qabul qilingan sovg'a kartalar, kimdan kelgani va kolleksiya.",
      },
    ],
  }),
  component: ReceivedGiftsRoute,
});

function ReceivedGiftsRoute() {
  const { t } = useTranslation();

  return (
    <DesktopPageSplit
      mobile={
        <MobilePageShell
          title={t("walletPage.title", { defaultValue: "Hamyon" })}
          subtitle={t("walletPage.received.title", { defaultValue: "Mening sovg'alarim" })}
          backTo="/wallet"
          strictBack
          flush
        >
          <div className="px-4 pb-8 pt-2">
            <WalletReceivedGiftsPage />
          </div>
        </MobilePageShell>
      }
      desktop={
        <div className="mx-auto max-w-2xl px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("walletPage.received.title", { defaultValue: "Mening sovg'alarim" })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("walletPage.received.subtitle", {
              defaultValue: "Qabul qilingan sovg'alar va kolleksiya",
            })}
          </p>
          <div className="mt-6">
            <WalletReceivedGiftsPage />
          </div>
        </div>
      }
    />
  );
}
