import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, CreditCard, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { paymentMethods, walletSummary } from "@/lib/mock-data";
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

const ICONS = {
  card: CreditCard,
  click: Smartphone,
  payme: Smartphone,
} as const;

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
  const [amount, setAmount] = useState<number>(100_000);
  const [custom, setCustom] = useState("");
  const [paymentId, setPaymentId] = useState(
    () => paymentMethods.find((pm) => pm.primary)?.id ?? paymentMethods[0].id,
  );
  const [done, setDone] = useState(false);

  const activePreset = PRESETS.includes(amount as (typeof PRESETS)[number]) && !custom;

  const totalAfter = useMemo(() => walletSummary.balance + amount, [amount]);

  const onPreset = (value: number) => {
    setCustom("");
    setAmount(value);
    setDone(false);
  };

  const onCustomChange = (value: string) => {
    setCustom(value);
    setAmount(parseAmount(value));
    setDone(false);
  };

  const canSubmit = amount >= 10_000;

  const onSubmit = () => {
    if (!canSubmit) return;
    setDone(true);
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
          {walletSummary.balance.toLocaleString("uz-UZ")}
          <span className="ml-1.5 text-base font-semibold text-background/55">so'm</span>
        </p>
      </ProfileSubpageCard>

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
                className={cn(
                  "rounded-2xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.98]",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground",
                )}
              >
                <p className="text-lg font-bold tabular-nums">
                  {Math.round(value / 1000)}k
                </p>
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
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder={t("topUpPage.customPlaceholder")}
          className="mt-2 w-full rounded-2xl border-0 bg-surface px-4 py-3.5 text-sm font-semibold tabular-nums placeholder:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
        />
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
          {t("topUpPage.minAmount")}
        </p>
      </section>

      <section className="mt-6">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("topUpPage.paymentMethod")}
        </h3>
        <div className="mt-3 space-y-2">
          {paymentMethods.map((pm) => {
            const Icon = ICONS[pm.type];
            const active = paymentId === pm.id;
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => {
                  setPaymentId(pm.id);
                  setDone(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.99]",
                  active
                    ? "border-foreground bg-surface/50"
                    : "border-border bg-background",
                )}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{pm.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{pm.detail}</p>
                </div>
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                    active ? "border-foreground bg-foreground text-background" : "border-border",
                  )}
                >
                  {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
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
        disabled={!canSubmit}
        onClick={onSubmit}
        className="mt-8 w-full rounded-2xl bg-foreground py-4 text-sm font-bold text-background transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("topUpPage.submit", { amount: formatInputAmount(amount) })}
      </button>
    </ProfileSubpageLayout>
  );
}
