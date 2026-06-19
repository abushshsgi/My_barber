import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { useTopUpWallet, useWalletBalance } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import {
  buildWalletTopUpOrderId,
  confirmPaymentCheckout,
  fetchPaymentProviders,
  startPaymentCheckout,
  type PaymentProvider,
} from "@/lib/api/payments";
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
  const userId = getAuthUserId();
  const { balance, isLoading } = useWalletBalance();
  const topUp = useTopUpWallet();
  const [amount, setAmount] = useState<number>(100_000);
  const [custom, setCustom] = useState("");
  const [provider, setProvider] = useState<"click" | "payme">("click");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const providersQ = useQuery({
    queryKey: ["payments", "providers", userId],
    queryFn: fetchPaymentProviders,
    enabled: Boolean(userId),
  });

  const activePreset = PRESETS.includes(amount as (typeof PRESETS)[number]) && !custom;
  const hasConfiguredProvider = (providersQ.data ?? []).some((p) => p.configured);

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

  const canSubmit = amount >= 10_000 && !submitting && !topUp.isPending;

  const runDebugTopUp = () => {
    if (!DEV_TOPUP) return;
    topUp.mutate(amount, {
      onSuccess: (data) => {
        setNewBalance(Number(data.balance));
        setDone(true);
        toast.success("Hamyon to'ldirildi");
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const onSubmit = async () => {
    if (!canSubmit || !userId) return;

    if (DEV_TOPUP && !hasConfiguredProvider) {
      runDebugTopUp();
      return;
    }

    setSubmitting(true);
    try {
      const orderId = buildWalletTopUpOrderId(userId, amount);
      const checkout = await startPaymentCheckout({
        provider,
        amount,
        order_id: orderId,
        return_url: typeof window !== "undefined" ? `${window.location.origin}/wallet/top-up` : undefined,
      });

      if (checkout.checkout_url) {
        window.location.assign(checkout.checkout_url);
        return;
      }

      if (DEV_TOPUP || !checkout.configured) {
        const confirmed = await confirmPaymentCheckout({
          provider,
          order_id: orderId,
          transaction_id: checkout.transaction_id,
        });
        setNewBalance(Number(confirmed.balance));
        setDone(true);
        toast.success("Hamyon to'ldirildi");
        return;
      }

      toast.error(checkout.message || "To'lov provayderi hozircha ulanmagan.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "To'lov xatosi");
    } finally {
      setSubmitting(false);
    }
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

      <section className="mt-6">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          To'lov usuli
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {(providersQ.data ?? [{ id: "click" }, { id: "payme" }] as PaymentProvider[]).map((p) => {
            const id = p.id as "click" | "payme";
            const active = provider === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setProvider(id)}
                className={cn(
                  "rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold capitalize transition-all",
                  active ? "border-foreground bg-foreground text-background" : "border-border bg-background",
                )}
              >
                {p.label ?? id}
                {!p.configured ? (
                  <span className="mt-1 block text-[10px] font-semibold opacity-60">
                    {DEV_TOPUP ? "Dev rejim" : "Tez orada"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("topUpPage.chooseAmount")}
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
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
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder={t("topUpPage.customPlaceholder")}
          className="mt-2 w-full rounded-2xl border-0 bg-surface px-4 py-3.5 text-sm font-semibold tabular-nums placeholder:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
        />
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">{t("topUpPage.minAmount")}</p>
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
        onClick={() => void onSubmit()}
        className="mt-8 w-full rounded-2xl bg-foreground py-4 text-sm font-bold text-background transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting || topUp.isPending
          ? "Kutilmoqda…"
          : t("topUpPage.submit", { amount: formatInputAmount(amount) })}
      </button>
    </ProfileSubpageLayout>
  );
}
