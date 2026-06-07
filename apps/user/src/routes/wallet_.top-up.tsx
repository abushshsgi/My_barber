import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { useTopUpWallet, useWalletBalance } from "@/hooks/use-wallet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet_/top-up")({
  head: () => ({
    meta: [
      { title: "To'ldirish — mysaloon.uz" },
      { name: "description", content: "Hamyon balansini to'ldirish." },
    ],
  }),
  component: TopUpPage,
});

const PRESETS = [50_000, 100_000, 200_000, 500_000] as const;
const DEV_TOPUP = import.meta.env.DEV;

function parseAmount(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function formatInputAmount(n: number) {
  if (!n) return "";
  return new Intl.NumberFormat("uz-UZ").format(n);
}

function TopUpPage() {
  const { t } = useTranslation();
  const { balance, isLoading } = useWalletBalance();
  const topUp = useTopUpWallet();
  const [amount, setAmount] = useState<number>(100_000);
  const [custom, setCustom] = useState("");
  const [done, setDone] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const activePreset = PRESETS.includes(amount as (typeof PRESETS)[number]) && !custom;

  const totalAfter = useMemo(
    () => (newBalance ?? balance + amount),
    [newBalance, balance, amount],
  );

  const onPreset = (value: number) => {
    setCustom("");
    setAmount(value);
    setDone(false);
    setNewBalance(null);
  };

  const onCustomChange = (value: string) => {
    setCustom(value);
    setAmount(parseAmount(value));
    setDone(false);
    setNewBalance(null);
  };

  const canSubmit = amount >= 10_000 && DEV_TOPUP && !topUp.isPending;

  const onSubmit = () => {
    if (!DEV_TOPUP) {
      toast.message("To'ldirish tez orada", {
        description: "Hozircha balans admin orqali to'ldiriladi.",
      });
      return;
    }
    if (!canSubmit) return;
    topUp.mutate(amount, {
      onSuccess: (data) => {
        setNewBalance(Number(data.balance));
        setDone(true);
        toast.success("Hamyon to'ldirildi");
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <ProfileSubpageLayout
      title={t("topUpPage.title")}
      subtitle={t("topUpPage.subtitle")}
      backTo="/wallet"
    >
      <ProfileSubpageCard className="border-foreground bg-foreground text-background">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-background/55">
          {t("topUpPage.currentBalance")}
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
          {isLoading ? "…" : balance.toLocaleString("uz-UZ")}
          <span className="ml-1.5 text-base font-semibold text-background/55">so'm</span>
        </p>
      </ProfileSubpageCard>

      {!DEV_TOPUP ? (
        <ProfileSubpageCard className="mt-4 border-dashed">
          <p className="text-sm font-bold">Click / Payme tez orada</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Production rejimida test to'ldirish o'chirilgan. Balans admin orqali qo'shiladi.
          </p>
        </ProfileSubpageCard>
      ) : null}

      <section className="mt-6">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("topUpPage.chooseAmount")}
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {PRESETS.map((value) => {
            const active = activePreset && amount === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onPreset(value)}
                disabled={!DEV_TOPUP}
                className={cn(
                  "rounded-2xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.98]",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground",
                  !DEV_TOPUP && "opacity-50",
                )}
              >
                <p className="text-lg font-bold tabular-nums">{Math.round(value / 1000)}k</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide opacity-60">
                  {formatInputAmount(value)} so'm
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <label
          htmlFor="top-up-custom"
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
        >
          {t("topUpPage.customAmount")}
        </label>
        <input
          id="top-up-custom"
          inputMode="numeric"
          value={custom}
          disabled={!DEV_TOPUP}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder={t("topUpPage.customPlaceholder")}
          className="mt-2 w-full rounded-2xl border-0 bg-surface px-4 py-3.5 text-sm font-semibold tabular-nums placeholder:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-50"
        />
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
          {t("topUpPage.minAmount")}
        </p>
      </section>

      {done ? (
        <ProfileSubpageCard className="mt-6 border-foreground bg-surface/60">
          <p className="text-sm font-bold">{t("topUpPage.successTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("topUpPage.successBody", {
              amount: formatInputAmount(amount),
              balance: formatInputAmount(totalAfter),
            })}
          </p>
        </ProfileSubpageCard>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit && DEV_TOPUP}
        onClick={onSubmit}
        className="mt-8 w-full rounded-2xl bg-foreground py-4 text-sm font-bold text-background transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {topUp.isPending
          ? "Kutilmoqda…"
          : DEV_TOPUP
            ? t("topUpPage.submit", { amount: formatInputAmount(amount) })
            : "Tez orada"}
      </button>
    </ProfileSubpageLayout>
  );
}
