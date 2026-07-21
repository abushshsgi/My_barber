import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { TopUpCardSheet } from "@/components/wallet/TopUpPaymentSheets";
import { useWalletBalance } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import {
  claimCardDeposit,
  fetchMyCardDeposits,
  initCardDeposit,
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
const OPEN_STATUSES = new Set(["awaiting_payment", "claimed"]);

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
  const [cardOpen, setCardOpen] = useState(false);
  const [deposit, setDeposit] = useState<CardDeposit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const depositsQ = useQuery({
    queryKey: ["wallet", "card-deposits", userId],
    queryFn: fetchMyCardDeposits,
    enabled: Boolean(userId),
    staleTime: 10_000,
    refetchInterval: pendingReview ? 8_000 : false,
  });

  const openDeposit = useMemo(
    () => (depositsQ.data ?? []).find((d) => OPEN_STATUSES.has(d.status)) ?? null,
    [depositsQ.data],
  );

  useEffect(() => {
    if (!pendingReview || !deposit) return;
    const latest = (depositsQ.data ?? []).find((d) => d.id === deposit.id);
    if (!latest) return;
    if (latest.status === "approved") {
      setDeposit(latest);
      setPendingReview(false);
      setDone(true);
      setNewBalance(balance + Number(latest.amount));
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success(t("topUpPage.creditedToast"));
    } else if (latest.status === "rejected") {
      setDeposit(latest);
      setPendingReview(false);
      toast.error(latest.review_note || t("topUpPage.paymentError"));
    }
  }, [depositsQ.data, pendingReview, deposit, t, qc, balance]);

  const activePreset = PRESETS.includes(amount as (typeof PRESETS)[number]) && !custom;
  const amountLabel = formatInputAmount(amount);
  const depositAmountLabel = deposit
    ? formatInputAmount(
        typeof deposit.amount === "number" ? deposit.amount : Number(deposit.amount) || 0,
      )
    : amountLabel;

  const totalAfter = useMemo(
    () => newBalance ?? balance + amount,
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

  const canSubmit = amount >= 10_000 && !submitting;

  const openExisting = (row: CardDeposit, resumedNotice = false) => {
    const n = typeof row.amount === "number" ? row.amount : Number(row.amount) || 0;
    setDeposit(row);
    setAmount(n);
    setCustom("");
    setCardOpen(true);
    setPendingReview(row.status === "claimed");
    setDone(false);
    if (resumedNotice) {
      toast.message(t("topUpPage.resumeOpen"));
    }
  };

  const runCardFlow = async () => {
    setSubmitting(true);
    try {
      // Avval ochiq so'rovni qayta ochamiz — xato toast emas.
      const latestOpen =
        openDeposit ??
        (await fetchMyCardDeposits()).find((d) => OPEN_STATUSES.has(d.status)) ??
        null;
      if (latestOpen) {
        openExisting(latestOpen, true);
        return;
      }

      const created = await initCardDeposit(amount);
      if (created.resumed) {
        openExisting(created, true);
        return;
      }
      openExisting(created, false);
      void qc.invalidateQueries({ queryKey: ["wallet", "card-deposits"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("topUpPage.paymentError"));
    } finally {
      setSubmitting(false);
    }
  };

  const onClaim = async (receipt: File) => {
    if (!deposit) return;
    setClaiming(true);
    try {
      const updated = await claimCardDeposit(deposit.id, receipt);
      setDeposit(updated);
      setPendingReview(true);
      setDone(false);
      toast.success(t("topUpPage.claimedToast"));
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void qc.invalidateQueries({ queryKey: ["wallet", "card-deposits"] });
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
      <div className="bg-black px-4 py-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
          {t("topUpPage.currentBalance")}
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
          {isLoading ? "…" : balance.toLocaleString("uz-UZ")}
          <span className="ml-1.5 text-base font-semibold text-white/45">so'm</span>
        </p>
      </div>

      {openDeposit ? (
        <button
          type="button"
          onClick={() => openExisting(openDeposit, false)}
          className="mt-4 w-full border border-black/15 bg-black/[0.03] px-4 py-3 text-left transition-opacity active:opacity-80"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">
            {t("topUpPage.openRequest")}
          </p>
          <p className="mt-1 text-sm font-semibold text-black">
            {formatInputAmount(
              typeof openDeposit.amount === "number"
                ? openDeposit.amount
                : Number(openDeposit.amount) || 0,
            )}{" "}
            so'm · {openDeposit.transaction_ref}
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-black/50">
            {openDeposit.status === "claimed"
              ? t("topUpPage.claimedPending")
              : t("topUpPage.continueOpen")}
          </p>
        </button>
      ) : null}

      <section className="mt-6">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
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
                  "border px-4 py-3.5 text-left transition-all active:scale-[0.98]",
                  active
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-white text-black",
                )}
              >
                <p className="text-lg font-bold tabular-nums">{Math.round(value / 1000)}k</p>
                <p
                  className={cn(
                    "mt-0.5 text-[10px] font-bold uppercase tracking-wide",
                    active ? "text-white/50" : "text-black/45",
                  )}
                >
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
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45"
        >
          {t("topUpPage.customAmount")}
        </label>
        <input
          id="top-up-custom"
          inputMode="numeric"
          value={custom}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder={t("topUpPage.customPlaceholder")}
          className="mt-2 w-full border border-black/15 bg-white px-4 py-3.5 text-sm font-semibold tabular-nums text-black placeholder:font-medium placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <p className="mt-2 text-[11px] font-medium text-black/45">{t("topUpPage.minAmount")}</p>
      </section>

      {done ? (
        <ProfileSubpageCard className="mt-6 border-black/15 bg-black/[0.03]">
          <p className="text-sm font-bold text-black">{t("topUpPage.successTitle")}</p>
          <p className="mt-1 text-xs text-black/55">
            {t("topUpPage.successBody", {
              amount: amountLabel,
              balance: formatInputAmount(totalAfter),
            })}
          </p>
        </ProfileSubpageCard>
      ) : null}

      {pendingReview && !cardOpen ? (
        <ProfileSubpageCard className="mt-6 border-black/15 bg-black/[0.03]">
          <p className="text-sm font-bold text-black">{t("topUpPage.pendingTitle")}</p>
          <p className="mt-1 text-xs text-black/55">
            {t("topUpPage.pendingBody", {
              ref: deposit?.transaction_ref ?? openDeposit?.transaction_ref ?? "—",
            })}
          </p>
        </ProfileSubpageCard>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void runCardFlow()}
        className="mt-8 w-full bg-black py-4 text-sm font-bold text-white transition-opacity active:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {submitting
          ? t("topUpPage.waiting")
          : openDeposit
            ? t("topUpPage.continuePay")
            : t("topUpPage.submit", { amount: amountLabel })}
      </button>

      <TopUpCardSheet
        open={cardOpen}
        onOpenChange={setCardOpen}
        deposit={deposit}
        amountLabel={depositAmountLabel}
        onClaim={(file) => void onClaim(file)}
        claiming={claiming}
      />
    </ProfileSubpageLayout>
  );
}
