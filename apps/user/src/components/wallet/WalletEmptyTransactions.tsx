import { Link } from "@tanstack/react-router";
import { CalendarPlus, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

export function WalletEmptyTransactions({ filteredEmpty }: { filteredEmpty: boolean }) {
  const { t } = useTranslation();

  if (filteredEmpty) {
    return (
      <div className="mt-8 flex flex-col items-center px-4 py-10 text-center">
        <div className="relative grid h-24 w-24 place-items-center rounded-[28px] bg-surface">
          <Receipt className="h-10 w-10 text-muted-foreground" strokeWidth={1.6} />
        </div>
        <p className="mt-5 text-sm font-bold">{t("walletPage.empty")}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col items-center px-4 py-10 text-center">
      <div className="relative h-[148px] w-[148px]" aria-hidden>
        <div className="absolute inset-0 rounded-[36px] bg-surface" />
        <div className="absolute left-3 top-5 h-[88px] w-[58px] rotate-[-8deg] rounded-2xl border-2 border-foreground bg-background shadow-md" />
        <div className="absolute right-3 top-8 h-[88px] w-[58px] rotate-[10deg] rounded-2xl border-2 border-foreground bg-foreground shadow-lg">
          <div className="mx-auto mt-4 h-5 w-8 rounded-md bg-background/20" />
          <div className="mx-3 mt-5 h-1.5 rounded-full bg-background/30" />
          <div className="mx-3 mt-2 h-1.5 w-2/3 rounded-full bg-background/20" />
        </div>
        <div className="absolute bottom-3 left-1/2 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full bg-foreground text-background shadow-lg">
          <CalendarPlus className="h-5 w-5" strokeWidth={2.2} />
        </div>
      </div>
      <h3 className="mt-6 text-base font-bold">{t("walletPage.emptyTitle")}</h3>
      <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
        {t("walletPage.emptyDesc")}
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background active:scale-[0.98]"
      >
        <CalendarPlus className="h-4 w-4" />
        {t("walletPage.emptyCta")}
      </Link>
    </div>
  );
}
