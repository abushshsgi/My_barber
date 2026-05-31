import { Link } from "@tanstack/react-router";
import { ChevronRight, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPrice, loyaltyMock, walletSummary } from "@/lib/mock-data";

export function ProfileWalletCard() {
  const { t } = useTranslation();

  return (
    <Link
      to="/wallet"
      className="mx-5 mt-5 block overflow-hidden rounded-2xl p-4 text-white active:scale-[0.99] transition-transform"
      style={{
        background: "linear-gradient(135deg, oklch(0.42 0.18 280), oklch(0.28 0.14 320))",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
          <Wallet className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-white/70" />
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
        {t("profile.wallet")}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{formatPrice(walletSummary.balance)}</p>
      <p className="mt-1 text-[11px] font-medium text-white/75">
        {loyaltyMock.tier} · {loyaltyMock.points.toLocaleString()} ball
      </p>
      <p className="mt-3 text-[11px] font-bold text-white/80">{t("profile.variant4.walletOpen")}</p>
    </Link>
  );
}
