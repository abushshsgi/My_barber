import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import {
  TopUpCardSheet,
  TopUpMethodSheet,
  type TopUpMethod,
} from "@/components/wallet/TopUpPaymentSheets";
import { useWalletBalance } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import {
  claimCardDeposit,
  fetchMyCardDeposits,
  fetchPaymentProviders,
  initCardDeposit,
  startPaymentCheckout,
  type CardDeposit,
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
  const qc = useQueryClient();
  const userId = getAuthUserId();
  const { balance, isLoading } = useWalletBalance();
  const [amount, setAmount] = useState<number>(100_000);
  const [custom, setCustom] = useState("");
  const [methodOpen, setMethodOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [deposit, setDeposit] = useState<CardDeposit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const providersQ = useQuery({
    queryKey: ["payments", "providers", userId],
    queryFn: fetchPaymentProviders,
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const providerReady = useMemo(() => {
    const map = { click: false, payme: false };
    for (const p of providersQ.data ?? []) {
      if (p.id === "click" || p.id === "payme") {
        map[p.id] = Boolean(p.configured);
      }
    }
    return map;
  }, [providersQ.data]);

  const depositsQ = useQuery({
    queryKey: ["wallet", "card-deposits", userId],
    queryFn: fetchMyCardDeposits,
    enabled: Boolean(userId) && pendingReview,
    refetchInterval: pendingReview ? 8_000 : false,
  });

  useEffect(() => {
    if (!pendingReview || !deposit) return;
    const latest = (depositsQ.data ?? []).find((d) => d.id === deposit.id);
    if (!latest) return;
    if (latest.status === "approved") {
      setDeposit(latest);
      setPendingReview(false);
      setDone(true);
      setNewBalance(balance + amount);
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success(t("topUpPage.creditedToast"));
    } else if (latest.status === "rejected") {
      setDeposit(latest);
      setPendingReview(false);
      toast.error(latest.review_note || t("topUpPage.paymentError"));
    }
  }, [depositsQ.data, pendingReview, deposit, t, qc, balance, amount]);

  const activePreset = PRESETS.includes(amount as (typeof PRESETS)[number]) && !custom;
  const amountLabel = formatInputAmount(amount);

  const totalAfter = useMemo(
    () => newBalance ?? balance + amount,
    [newBalance, balance, amount],
  );

  const onPreset = (value: number) => {
    setCustom("");
    setAmount(value);
    setDone(false);
    setPendingReview(false);
    setNewBalance(null);
  };

  const onCustomChange = (value: string) => {
    setCustom(value);
    setAmount(parseAmount(value));
    setDone(false);
    setPendingReview(false);
    setNewBalance(null);
  };

  const canSubmit = amount >= 10_000 && !submitting;

  const invalidateWallet = () => {
    void qc.invalidateQueries({ queryKey: ["wallet"] });
  };

  const runProviderCheckout = async (provider: "click" | "payme") => {
    if (!userId) return;
    if (!providerReady[provider]) {
      toast.error(t("topUpPage.providerUnavailable"));
      return;
    }

    setSubmitting(true);
    try {
      const orderId = `wallet-topup-${userId}-${amount}-${Date.now()}`;
      const checkout = await startPaymentCheckout({
        provider,
        amount,
        order_id: orderId,
        return_url:
          typeof window !== "undefined" ? `${window.location.origin}/wallet/top-up` : undefined,
      });

      // Faqat haqiqiy checkout URL. Client confirm orqali hech qachon pul tushirilmaydi.
      if (checkout.configured && checkout.checkout_url) {
        window.location.assign(checkout.checkout_url);
        return;
      }

      toast.error(checkout.message || t("topUpPage.providerUnavailable"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("topUpPage.paymentError"));
    } finally {
      setSubmitting(false);
    }
  };

  const runCardFlow = async () => {
    setSubmitting(true);
    try {
      const created = await initCardDeposit(amount);
      setDeposit(created);
      setMethodOpen(false);
      setCardOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("topUpPage.paymentError"));
    } finally {
      setSubmitting(false);
    }
  };

  const onSelectMethod = (method: TopUpMethod) => {
    if (method === "card") {
      void runCardFlow();
      return;
    }
    void runProviderCheckout(method);
  };

  const onClaim = async () => {
    if (!deposit) return;
    setClaiming(true);
    try {
      const updated = await claimCardDeposit(deposit.id);
      setDeposit(updated);
      setPendingReview(true);
      setDone(false);
      toast.success(t("topUpPage.claimedToast"));
      invalidateWallet();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("topUpPage.paymentError"));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <ProfileSubpageLayout
      title={t("topUpPage.title")}
      subtitle={t("topUpPage.subtitle")}
      backTo="/wallet"
    >
      <div
        className="overflow-hidden rounded-2xl border-0 p-4 text-background shadow-[0_16px_40px_-20px_oklch(0.2_0.03_60/0.45)]"
        style={{
          background:
            "linear-gradient(145deg, oklch(0.24 0.025 55), oklch(0.16 0.02 50) 52%, oklch(0.2 0.035 72))",
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-background/55">
          {t("topUpPage.currentBalance")}
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
          {isLoading ? "…" : balance.toLocaleString("uz-UZ")}
          <span className="ml-1.5 text-base font-semibold text-background/55">so'm</span>
        </p>
      </div>

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
                    ? "border-[oklch(0.28_0.03_55)] bg-[oklch(0.22_0.025_55)] text-[oklch(0.97_0.01_85)] shadow-[0_10px_24px_-14px_oklch(0.2_0.03_60/0.55)]"
                    : "border-border/80 bg-[oklch(0.985_0.008_85)] text-foreground hover:border-[oklch(0.55_0.04_70)]",
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
          className="mt-2 w-full rounded-2xl border border-border/70 bg-[oklch(0.96_0.01_85)] px-4 py-3.5 text-sm font-semibold tabular-nums placeholder:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.35_0.03_55)]"
        />
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">{t("topUpPage.minAmount")}</p>
      </section>

      {done ? (
        <ProfileSubpageCard className="mt-6 border-emerald-500/25 bg-emerald-500/8">
          <p className="text-sm font-bold text-emerald-950">{t("topUpPage.successTitle")}</p>
          <p className="mt-1 text-xs text-emerald-950/70">
            {t("topUpPage.successBody", {
              amount: amountLabel,
              balance: formatInputAmount(totalAfter),
            })}
          </p>
        </ProfileSubpageCard>
      ) : null}

      {pendingReview ? (
        <ProfileSubpageCard className="mt-6 border-amber-500/30 bg-amber-500/10">
          <p className="text-sm font-bold text-amber-950">{t("topUpPage.pendingTitle")}</p>
          <p className="mt-1 text-xs text-amber-950/75">
            {t("topUpPage.pendingBody", {
              ref: deposit?.transaction_ref ?? "—",
            })}
          </p>
        </ProfileSubpageCard>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => setMethodOpen(true)}
        className="mt-8 w-full rounded-2xl bg-[oklch(0.22_0.025_55)] py-4 text-sm font-bold text-[oklch(0.97_0.01_85)] shadow-[0_14px_28px_-16px_oklch(0.2_0.03_60/0.55)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting
          ? t("topUpPage.waiting")
          : t("topUpPage.submit", { amount: amountLabel })}
      </button>

      <TopUpMethodSheet
        open={methodOpen}
        onOpenChange={setMethodOpen}
        amountLabel={amountLabel}
        onSelect={onSelectMethod}
        busy={submitting}
        providerReady={providerReady}
      />

      <TopUpCardSheet
        open={cardOpen}
        onOpenChange={setCardOpen}
        deposit={deposit}
        amountLabel={amountLabel}
        onClaim={() => void onClaim()}
        claiming={claiming}
      />
    </ProfileSubpageLayout>
  );
}
