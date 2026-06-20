import { Link } from "@tanstack/react-router";
import { ChevronRight, Plus, Wallet } from "lucide-react";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { formatPrice } from "@/lib/mock-data";

type Props = {
  name: string;
  phone: string;
  audienceLabel: string;
  initials: string;
  balance: number;
  walletLoading: boolean;
  stats?: {
    bookingsCount: number;
    favoritesCount: number;
    reviewsCount: number;
  } | null;
};

export function ProfileDesktopHero({
  name,
  phone,
  audienceLabel,
  initials,
  balance,
  walletLoading,
  stats,
}: Props) {
  const { t } = useAppTranslation();

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface/30 p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-5">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-surface">
          <span className="text-3xl font-bold">{initials}</span>
        </div>
        <div className="min-w-0">
          <Link to="/settings" className="inline-flex max-w-full items-center gap-1 hover:opacity-80">
            <h2 className="truncate text-xl font-bold tracking-tight">{name}</h2>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
          <p className="mt-1 truncate text-sm text-muted-foreground">{phone}</p>
          <span className="mt-2 inline-flex rounded-full bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground">
            {audienceLabel}
          </span>
          {stats ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <StatChip label={t("profile.bookings")} value={stats.bookingsCount} />
              <StatChip label={t("favorites.title", { defaultValue: "Sevimli" })} value={stats.favoritesCount} />
              <StatChip label={t("reviews.title", { defaultValue: "Sharh" })} value={stats.reviewsCount} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 rounded-2xl bg-foreground p-5 text-background lg:min-w-[240px]">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-background/15">
            <Wallet className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-xs font-bold text-background/70">{t("profile.wallet")}</p>
            <p className="text-2xl font-bold tabular-nums">
              {walletLoading ? "…" : formatPrice(balance)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/wallet"
            className="flex-1 rounded-xl bg-background/15 py-2 text-center text-xs font-bold hover:bg-background/25"
          >
            {t("profile.wallet")}
          </Link>
          <Link
            to="/wallet/top-up"
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-background px-3 py-2 text-xs font-bold text-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("walletPage.topUp", { defaultValue: "To'ldirish" })}
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold">
      <span className="tabular-nums text-foreground">{value}</span>
      <span className="font-semibold text-muted-foreground">{label}</span>
    </span>
  );
}
