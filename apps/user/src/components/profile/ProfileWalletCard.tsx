import { Link } from "@tanstack/react-router";
import { Nfc } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WalletCardCreamCap, walletCardStyle } from "@/components/wallet/WalletCardBrand";
import { formatPrice, loyaltyMock, walletSummary } from "@/lib/mock-data";

/** Profil — gorizontal split karta. */
export function ProfileWalletCard() {
  const { t } = useTranslation();

  return (
    <Link
      to="/wallet"
      className="relative mx-5 mt-5 block overflow-hidden rounded-[20px] text-background active:scale-[0.99]"
      style={{
        background: walletCardStyle.background,
        boxShadow: walletCardStyle.profileShadow,
      }}
    >
      <WalletCardCreamCap className="h-[48%] rounded-b-[22px]" />
      <div className="relative z-10 flex items-start justify-between px-4 pb-1 pt-4 text-foreground">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {t("profile.wallet")}
        </p>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
          <Nfc className="h-4 w-4" strokeWidth={2.2} />
        </div>
      </div>
      <p className="relative z-10 px-4 text-2xl font-bold tabular-nums text-foreground">
        {formatPrice(walletSummary.balance)}
      </p>
      <div className="px-4 pb-2 pt-3 text-[10px] font-medium text-background/45">
        {loyaltyMock.tier} · {t("walletPage.plasticHint")}
      </div>
    </Link>
  );
}
